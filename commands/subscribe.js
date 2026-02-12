const {
  SlashCommandBuilder,
  InteractionContextType,
  ApplicationIntegrationType,
} = require('discord.js');
const { STATES, countiesForState, FLAT_LIST } = require('../config/counties');
const { addSubscription } = require('../utils/store');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription('Get DM notifications when a county has new bookings')
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
        .setDescription('County to subscribe to')
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

    const added = addSubscription(interaction.user.id, subdomain, entry.state, entry.county);
    if (!added) {
      return interaction.reply({
        content: `ℹ️ You are already subscribed to **${entry.county}, ${entry.state}**.`,
        ephemeral: true,
      });
    }

    await interaction.reply({
      content:
        `✅ Subscribed! You will receive a DM whenever new bookings appear for **${entry.county}, ${entry.state}**.\n` +
        `Use \`/unsubscribe\` to stop notifications.`,
      ephemeral: true,
    });
  },
};
