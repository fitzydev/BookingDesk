const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  ApplicationIntegrationType,
} = require('discord.js');
const { configKeyFromInteraction, getSettings } = require('../utils/store');
const { scrapeRecentList } = require('../utils/scraper');
const { findBySubdomain } = require('../config/counties');
const { recordEmbed, batchHeaderEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scrape')
    .setDescription('Trigger an immediate scrape and post new records')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),

  async execute(interaction) {
    const configKey = configKeyFromInteraction(interaction);
    const settings = getSettings(configKey);
    if (!settings || !settings.trackedSubdomains?.length) {
      return interaction.reply({
        content: '❌ No counties are being tracked. Run `/setup` first.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    let totalNew = 0;
    const errors = [];

    // Resolve delivery target
    let channel = null;
    if (interaction.guildId && settings.channelId) {
      channel = interaction.guild?.channels.cache.get(settings.channelId) ?? null;
    }

    for (const sub of settings.trackedSubdomains) {
      try {
        const entry = findBySubdomain(sub);
        const records = await scrapeRecentList(sub);
        totalNew += records.length;

        if (!records.length) continue;

        const embeds = records.slice(0, 3).map((r) =>
          recordEmbed(r, entry?.state ?? '??', entry?.county ?? sub),
        );
        embeds.unshift(batchHeaderEmbed(entry?.county ?? sub, entry?.state ?? '', records.length));
        const payload = { embeds };

        if (channel) {
          await channel.send(payload);
        } else {
          // DM delivery — send to the invoking user
          const dm = await interaction.user.createDM();
          await dm.send(payload);
        }
      } catch (err) {
        errors.push(`${sub}: ${err.message}`);
      }
    }

    const msg = [`✅ Scrape Complete — **${totalNew}** records found!`];
    if (errors.length) msg.push(`\n⚠️ Errors:\n${errors.join('\n')}`);

    await interaction.editReply({ content: msg.join('') });
  },
};
