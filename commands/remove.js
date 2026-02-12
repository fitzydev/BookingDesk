const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  ApplicationIntegrationType,
} = require('discord.js');
const { STATES, countiesForState, FLAT_LIST } = require('../config/counties');
const { configKeyFromInteraction, getSettings, setSettings } = require('../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Stop tracking a county')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .addStringOption((opt) =>
      opt
        .setName('state')
        .setDescription('State')
        .setRequired(true)
        .addChoices(...STATES.map((s) => ({ name: s, value: s }))),
    )
    .addStringOption((opt) =>
      opt
        .setName('county')
        .setDescription('County to stop tracking')
        .setRequired(true)
        .setAutocomplete(true),
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
    const subdomain = interaction.options.getString('county');
    const entry = FLAT_LIST.find((e) => e.subdomain === subdomain);
    if (!entry) {
      return interaction.reply({ content: '❌ Invalid county.', ephemeral: true });
    }

    const configKey = configKeyFromInteraction(interaction);
    const settings = getSettings(configKey);
    if (!settings) {
      return interaction.reply({
        content: '❌ Bot is not configured. Run `/setup` first.',
        ephemeral: true,
      });
    }

    const tracked = new Set(settings.trackedSubdomains ?? []);
    if (!tracked.has(subdomain)) {
      return interaction.reply({
        content: `ℹ️ **${entry.county}, ${entry.state}** is not being tracked.`,
        ephemeral: true,
      });
    }

    tracked.delete(subdomain);
    setSettings(configKey, { trackedSubdomains: [...tracked] });

    await interaction.reply({
      content: `✅ Stopped tracking **${entry.county}, ${entry.state}**.`,
      ephemeral: true,
    });

    interaction.client.emit('settingsUpdated', configKey);
  },
};
