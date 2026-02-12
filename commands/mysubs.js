const {
  SlashCommandBuilder,
  InteractionContextType,
  ApplicationIntegrationType,
} = require('discord.js');
const { getUserSubscriptions } = require('../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mysubs')
    .setDescription('List your current DM subscriptions')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel),

  async execute(interaction) {
    const subs = getUserSubscriptions(interaction.user.id);
    if (!subs.length) {
      return interaction.reply({
        content: 'You have no active subscriptions. Use `/subscribe` to add one.',
        ephemeral: true,
      });
    }

    const list = subs.map((s, i) => `**${i + 1}.** ${s.county}, ${s.state}`).join('\n');
    await interaction.reply({
      content: `📋 **Your Subscriptions:**\n${list}`,
      ephemeral: true,
    });
  },
};
