const {
  SlashCommandBuilder,
  InteractionContextType,
  ApplicationIntegrationType,
} = require('discord.js');
const { STATES, countiesForState, FLAT_LIST } = require('../config/counties');
const { removeSubscription, getUserSubscriptions } = require('../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unsubscribe')
    .setDescription('Stop receiving DM notifications for a county')
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
        .setDescription('County to unsubscribe from')
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

    const removed = removeSubscription(interaction.user.id, subdomain);
    if (!removed) {
      return interaction.reply({
        content: `ℹ️ You weren't subscribed to **${entry.county}, ${entry.state}**.`,
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: `✅ Unsubscribed from **${entry.county}, ${entry.state}**.`,
      ephemeral: true,
    });
  },
};
