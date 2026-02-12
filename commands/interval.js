const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  ApplicationIntegrationType,
} = require('discord.js');
const { MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES } = require('../config/defaults');
const { configKeyFromInteraction, getSettings, setSettings } = require('../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('interval')
    .setDescription('Change the scrape interval')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .addIntegerOption((opt) =>
      opt
        .setName('minutes')
        .setDescription('New interval in minutes')
        .setMinValue(MIN_INTERVAL_MINUTES)
        .setMaxValue(MAX_INTERVAL_MINUTES)
        .setRequired(true),
    ),

  async execute(interaction) {
    const configKey = configKeyFromInteraction(interaction);
    const settings = getSettings(configKey);
    if (!settings) {
      return interaction.reply({
        content: '❌ Run `/setup` first to configure the bot.',
        ephemeral: true,
      });
    }

    const minutes = interaction.options.getInteger('minutes');
    setSettings(configKey, { intervalMinutes: minutes });

    await interaction.reply({
      content: `✅ Scrape interval updated to **${minutes}** minutes.`,
      ephemeral: true,
    });

    interaction.client.emit('settingsUpdated', configKey);
  },
};
