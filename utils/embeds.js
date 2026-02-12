const { EmbedBuilder } = require('discord.js');

/* ── colour palette ── */
const ACCENT = 0x5865f2; // blurple – record cards
const DETAIL_ACCENT = 0xed4245; // red    – detail / charges view
const DIVIDER = '─'.repeat(32);

/**
 * Build a rich embed card for a booking record.
 * @param {object} record  - { id, name, bookingDate, thumbnail, detailUrl }
 * @param {string} state
 * @param {string} county
 */
function recordEmbed(record, state, county) {
  const embed = new EmbedBuilder()
    .setAuthor({ name: `${county}, ${state}`, iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' })
    .setTitle(`🔗 ${record.name}`)
    .setURL(record.detailUrl)
    .setColor(ACCENT)
    .setDescription(
      `> 🗓️ **Booked:** ${record.bookingDate || 'N/A'}\n` +
      `> 📍 **County:** ${county}\n` +
      `> 🏷️ **ID:** \`${record.id}\``,
    )
    .setFooter({ text: `publicjailrecords.com  •  ${state}`, iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' })
    .setTimestamp();

  if (record.thumbnail && record.thumbnail.startsWith('http')) {
    embed.setThumbnail(record.thumbnail);
  }

  return embed;
}

/**
 * Build a detailed embed from a full arrest detail scrape.
 */
function detailEmbed(detail, state, county, detailUrl) {
  const chargeList = detail.charges.length
    ? detail.charges.map((c, i) => `\`${i + 1}.\` ${c}`).join('\n')
    : '*None listed*';

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${county}, ${state}  —  Detail View` })
    .setTitle(`⚖️ ${detail.name}`)
    .setURL(detailUrl)
    .setColor(DETAIL_ACCENT)
    .setDescription(
      `${DIVIDER}\n` +
      `> 🗓️ **Booking Date:** ${detail.bookingDate || 'N/A'}\n` +
      `> 🏛️ **Agency:** ${detail.agency || 'N/A'}\n` +
      `> 📍 **Location:** ${county}, ${state}\n` +
      `${DIVIDER}`,
    )
    .addFields(
      { name: '📋 Charges', value: chargeList.slice(0, 1024) },
    )
    .setFooter({ text: 'publicjailrecords.com' })
    .setTimestamp();

  if (detail.image && detail.image.startsWith('http')) {
    embed.setThumbnail(detail.image);
  }

  return embed;
}

/**
 * Build a summary header embed used above a batch of record cards.
 * @param {string} county
 * @param {string} state
 * @param {number} count  – total new records this cycle
 */
function batchHeaderEmbed(county, state, count) {
  return new EmbedBuilder()
    .setColor(0xfee75c) // yellow accent
    .setTitle(`📋 New Bookings — ${county}, ${state}`)
    .setDescription(`**${count}** new record${count === 1 ? '' : 's'} found`)
    .setTimestamp();
}

module.exports = { recordEmbed, detailEmbed, batchHeaderEmbed };
