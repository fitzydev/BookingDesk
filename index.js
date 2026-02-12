require('dotenv/config');
const fs = require('fs');
const path = require('path');
const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Events,
} = require('discord.js');

const { scrapeRecentList } = require('./utils/scraper');
const { recordEmbed, batchHeaderEmbed } = require('./utils/embeds');
const {
  getAllSettings,
  getSettings,
  getSeenIds,
  markSeen,
  getSubscribersForSubdomain,
} = require('./utils/store');
const { findBySubdomain } = require('./config/counties');
const { RECORDS_PER_MESSAGE, DEFAULT_INTERVAL_MINUTES } = require('./config/defaults');

/* ══════════════════════════════════════
   Client Setup
   ══════════════════════════════════════ */

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel],
});

/* ── Slash commands loader── */
client.commands = new Collection();
const cmdDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(cmdDir).filter((f) => f.endsWith('.js'))) {
  const cmd = require(path.join(cmdDir, file));
  if (cmd.data && cmd.execute) client.commands.set(cmd.data.name, cmd);
}

/* ══════════════════════════════════════
   Interaction Handlers
   ══════════════════════════════════════

   Permission enforcement:
   • In a guild — Discord enforces setDefaultMemberPermissions(ManageGuild)
     so only members with that permission see/run admin commands.
   • In DMs / user-install — the installing user inherently has access
     to all commands (Discord allows this by design).
   No manual permission checks needed.
   ══════════════════════════════════════ */

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const cmd = client.commands.get(interaction.commandName);
    if (!cmd) return;

    try {
      await cmd.execute(interaction);
    } catch (err) {
      console.error(`[CMD] ${interaction.commandName}:`, err);
      const msg = { content: '❌ Something went wrong, check syntax?', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
    return;
  }

  if (interaction.isAutocomplete()) {
    const cmd = client.commands.get(interaction.commandName);
    if (cmd?.autocomplete) {
      try {
        await cmd.autocomplete(interaction);
      } catch (err) {
        console.error(`[AC] ${interaction.commandName}:`, err);
      }
    }
  }
});

/* ══════════════════════════════════════
   Scraping Scheduler, it's where some of the magic happens.
   ══════════════════════════════════════

   Config keys are "guild:<id>" or "user:<id>".
   • guild configs → post to a channel in that guild
   • user  configs → DM the user directly
   ══════════════════════════════════════ */

/** Map<configKey, NodeJS.Timeout> */
const timers = new Map();

/**
 * Run a full scrape cycle for one config key.
 */
async function scrapeForConfig(configKey) {
  const settings = getSettings(configKey);
  if (!settings?.trackedSubdomains?.length) return;

  const isGuild = configKey.startsWith('guild:');
  const id = configKey.split(':')[1]; // guildId or userId

  // Resolve the delivery target
  let channel = null;
  let dmUser = null;

  if (isGuild && settings.channelId) {
    const guild = client.guilds.cache.get(id);
    if (!guild) return;
    channel = guild.channels.cache.get(settings.channelId);
    if (!channel) {
      console.warn(`[SCHED] Channel ${settings.channelId} not found in guild ${id}`);
      return;
    }
    // Verify the bot can actually send messages + embeds in this channel
    const me = guild.members.me;
    if (me) {
      const perms = channel.permissionsFor(me);
      if (!perms || !perms.has(['SendMessages', 'EmbedLinks', 'ViewChannel'])) {
        const missing = ['SendMessages', 'EmbedLinks', 'ViewChannel']
          .filter((p) => !perms?.has(p));
        console.warn(
          `[SCHED] Missing permissions in #${channel.name} (${id}): ${missing.join(', ')}. ` +
          `Grant these to the bot role or pick a different channel with /setup.`,
        );
        return;
      }
    }
  } else {
    // Playing around with DM delivery for scrape alerts.
    try {
      dmUser = await client.users.fetch(settings.ownerId ?? id);
    } catch {
      console.warn(`[SCHED] Cannot reach user ${settings.ownerId ?? id} for DM delivery`);
      return;
    }
  }

  for (const sub of settings.trackedSubdomains) {
    try {
      const entry = findBySubdomain(sub);
      const state = entry?.state ?? '??';
      const county = entry?.county ?? sub;

      const records = await scrapeRecentList(sub);
      const seen = getSeenIds(configKey, sub);

      const fresh = records.filter((r) => !seen.has(r.id));
      if (!fresh.length) continue;

      // Post in batches
      for (let i = 0; i < fresh.length; i += RECORDS_PER_MESSAGE) {
        const batch = fresh.slice(i, i + RECORDS_PER_MESSAGE);
        const embeds = batch.map((r) => recordEmbed(r, state, county));

        // First batch gets a header embed
        if (i === 0) {
          embeds.unshift(batchHeaderEmbed(county, state, fresh.length));
        }

        const payload = { embeds };

        if (channel) {
          await channel.send(payload);
        } else if (dmUser) {
          const dm = await dmUser.createDM();
          await dm.send(payload);
        }

        if (i + RECORDS_PER_MESSAGE < fresh.length) {
          await sleep(1500);
        }
      }

      // Mark as seen
      markSeen(configKey, sub, fresh.map((r) => r.id));

      // Also DM individual subscribers (separate from config-level delivery)
      const subs = getSubscribersForSubdomain(sub);
      for (const subEntry of subs) {
        // Skip if this user is already the DM config owner (avoid double-send)
        if (!isGuild && (settings.ownerId ?? id) === subEntry.userId) continue;

        try {
          const user = await client.users.fetch(subEntry.userId);
          const dm = await user.createDM();
          const preview = fresh.slice(0, 3).map((r) => recordEmbed(r, state, county));
          preview.unshift(batchHeaderEmbed(county, state, fresh.length));
          await dm.send({ embeds: preview });
        } catch (dmErr) {
          console.warn(`[DM] Could not DM ${subEntry.userId}:`, dmErr.message);
        }
      }
    } catch (err) {
      console.error(`[SCHED] Error scraping ${sub} for ${configKey}:`, err.message);
    }
  }
}

/** Start (or restart) the timer for a config key */
function startTimer(configKey) {
  stopTimer(configKey);

  const settings = getSettings(configKey);
  if (!settings?.trackedSubdomains?.length) return;

  // Guild configs need a channelId; user configs deliver via DM (always valid)
  if (configKey.startsWith('guild:') && !settings.channelId) return;

  const ms = (settings.intervalMinutes ?? DEFAULT_INTERVAL_MINUTES) * 60_000;

  console.log(
    `[SCHED] ${configKey}: scraping every ${settings.intervalMinutes ?? DEFAULT_INTERVAL_MINUTES}m ` +
    `(${settings.trackedSubdomains.length} counties)`,
  );

  // Run immediately, then repeat
  scrapeForConfig(configKey).catch((e) =>
    console.error(`[SCHED] Initial scrape failed for ${configKey}:`, e.message),
  );

  const timer = setInterval(() => {
    scrapeForConfig(configKey).catch((e) =>
      console.error(`[SCHED] Scrape failed for ${configKey}:`, e.message),
    );
  }, ms);

  timers.set(configKey, timer);
}

function stopTimer(configKey) {
  if (timers.has(configKey)) {
    clearInterval(timers.get(configKey));
    timers.delete(configKey);
  }
}

/* Listen for settings changes from commands */
client.on('settingsUpdated', (configKey) => {
  console.log(`[SCHED] Restarting timer for ${configKey}`);
  startTimer(configKey);
});

/* ══════════════════════════════════════
   Ready
   ══════════════════════════════════════ */

client.once(Events.ClientReady, (c) => {
  console.log(`✅ Logged in as ${c.user.tag}`);
  console.log(`   Guilds: ${c.guilds.cache.size}`);

  // Spin up timers for every saved config
  const allSettings = getAllSettings();
  for (const configKey of Object.keys(allSettings)) {
    startTimer(configKey);
  }
});

/* ── helpers ── */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ══════════════════════════════════════
   Login
   ══════════════════════════════════════ */

client.login(process.env.DISCORD_TOKEN);
