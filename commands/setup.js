const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  InteractionContextType,
  ApplicationIntegrationType,
} = require('discord.js');
const { STATES, countiesForState, FLAT_LIST } = require('../config/counties');
const { configKeyFromInteraction, getSettings, setSettings } = require('../utils/store');
const { DEFAULT_INTERVAL_MINUTES } = require('../config/defaults');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure BookingDesk — tracks a county and posts new bookings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .addStringOption((opt) =>
      opt
        .setName('state')
        .setDescription('State to track')
        .setRequired(true)
        .addChoices(...STATES.map((s) => ({ name: s, value: s }))),
    )
    .addStringOption((opt) =>
      opt
        .setName('county')
        .setDescription('County to track (type to search)')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('Channel to post in (guild only — omit to deliver via DM)')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    )
    .addIntegerOption((opt) =>
      opt
        .setName('interval')
        .setDescription(`Scrape interval in minutes (default: ${DEFAULT_INTERVAL_MINUTES})`)
        .setMinValue(5)
        .setMaxValue(1440)
        .setRequired(false),
    ),

  async autocomplete(interaction) {
    const state = interaction.options.getString('state');
    const focused = interaction.options.getFocused().toLowerCase();
    if (!state) return interaction.respond([]);

    const counties = countiesForState(state);
    const filtered = counties
      .filter((c) => c.county.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((c) => ({ name: c.county, value: c.subdomain }));

    await interaction.respond(filtered);
  },

  async execute(interaction) {
    const state = interaction.options.getString('state');
    const subdomain = interaction.options.getString('county');
    const channel = interaction.options.getChannel('channel'); // null in DMs
    const interval = interaction.options.getInteger('interval') ?? DEFAULT_INTERVAL_MINUTES;

    const entry = FLAT_LIST.find((e) => e.subdomain === subdomain);
    if (!entry) {
      return interaction.reply({ content: '❌ Invalid county selection.', ephemeral: true });
    }

    const configKey = configKeyFromInteraction(interaction);
    const existing = getSettings(configKey);
    const tracked = new Set(existing?.trackedSubdomains ?? []);
    tracked.add(subdomain);

    const isGuild = !!interaction.guildId;
    const deliveryType = isGuild && channel ? 'channel' : 'dm';

    const update = {
      intervalMinutes: interval,
      trackedSubdomains: [...tracked],
      delivery: deliveryType,
      ownerId: interaction.user.id,
    };

    if (deliveryType === 'channel') {
      update.channelId = channel.id;
    }

    setSettings(configKey, update);

    const deliveryText = deliveryType === 'channel'
      ? `Channel: <#${channel.id}>`
      : 'Delivery: **DM** (direct messages to you)';

    await interaction.reply({
      content:
        `✅ **BookingDesk configured!**\n` +
        `• ${deliveryText}\n` +
        `• Tracking: **${entry.county}, ${entry.state}**\n` +
        `• Interval: every **${interval}** minutes\n\n` +
        `Use \`/setup\` again to add more counties. Use \`/remove\` to stop tracking one.`,
      ephemeral: true,
    });

    interaction.client.emit('settingsUpdated', configKey);
  },
};
