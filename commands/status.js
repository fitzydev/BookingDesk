const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  ApplicationIntegrationType,
} = require('discord.js');
const { configKeyFromInteraction, getSettings } = require('../utils/store');
const { findBySubdomain } = require('../config/counties');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show current BookingDesk configuration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),

  async execute(interaction) {
    const configKey = configKeyFromInteraction(interaction);
    const settings = getSettings(configKey);
    if (!settings) {
      return interaction.reply({
        content: '❌ Bot is not configured yet. Run `/setup` first.',
        ephemeral: true,
      });
    }

    const tracked = (settings.trackedSubdomains ?? [])
      .map((sub) => {
        const e = findBySubdomain(sub);
        return e ? `${e.county}, ${e.state}` : sub;
      })
      .join('\n') || 'None';

    const deliveryText = settings.delivery === 'channel' && settings.channelId
      ? `<#${settings.channelId}>`
      : 'Direct Messages';

    const embed = new EmbedBuilder()
      .setTitle('⚙️ BookingDesk Status')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Delivery', value: deliveryText, inline: true },
        { name: 'Interval', value: `${settings.intervalMinutes} min`, inline: true },
        { name: 'Tracked Counties', value: tracked },
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
