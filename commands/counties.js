const {
  SlashCommandBuilder,
  EmbedBuilder,
  InteractionContextType,
  ApplicationIntegrationType,
} = require('discord.js');
const { STATES, FLAT_LIST } = require('../config/counties');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('counties')
    .setDescription('List all supported counties')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .addStringOption((opt) =>
      opt
        .setName('state')
        .setDescription('Filter by state (leave blank for all)')
        .setRequired(false)
        .addChoices(...STATES.map((s) => ({ name: s, value: s }))),
    ),

  async execute(interaction) {
    const stateFilter = interaction.options.getString('state');

    const entries = stateFilter
      ? FLAT_LIST.filter((e) => e.state === stateFilter)
      : FLAT_LIST;

    if (!entries.length) {
      return interaction.reply({ content: 'No counties found.', ephemeral: true });
    }

    // Group by state for display
    const grouped = {};
    for (const e of entries) {
      (grouped[e.state] ??= []).push(e.county);
    }

    const embed = new EmbedBuilder()
      .setTitle('📍 Supported Counties')
      .setColor(0x3498db)
      .setFooter({ text: `${entries.length} counties total` });

    for (const [state, counties] of Object.entries(grouped)) {
      embed.addFields({
        name: state,
        value: counties.join(', '),
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
