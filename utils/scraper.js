const axios = require('axios');
const cheerio = require('cheerio');
const { USER_AGENT } = require('../config/defaults');

const http = axios.create({
  timeout: 15_000,
  headers: { 'User-Agent': USER_AGENT },
});

/**
 * Build the base URL for a county subdomain.
 * @param {string} subdomain e.g. "bellcountytx"
 */
function baseUrl(subdomain) {
  return `https://${subdomain}.publicjailrecords.com/app`;
}

/**
 * Scrape the recent-arrests landing page for a county.
 * Returns an array of record stubs (id, name, thumbnail, booking date).
 * @param {string} subdomain
 * @returns {Promise<Array<{id:string, name:string, thumbnail:string, bookingDate:string, detailUrl:string}>>}
 */
async function scrapeRecentList(subdomain) {
  const url = `${baseUrl(subdomain)}/index.php`;
  const { data: html } = await http.get(url);
  const $ = cheerio.load(html);

  const records = [];

  // Each arrest card is typically an <a> linking to arrest.php?subject=ID
  $('a[href*="arrest.php?subject="]').each((_i, el) => {
    const href = $(el).attr('href') || '';
    const idMatch = href.match(/subject=(\d+)/);
    if (!idMatch) return;

    const id = idMatch[1];
    const name = $(el).find('h6, h5, h4, .fw-bold, strong').first().text().trim()
      || $(el).text().trim().split('\n')[0].trim();
    const thumb = $(el).find('img').attr('src') || '';
    const dateText = $(el).find('.text-muted, small').first().text().trim();

    // Resolve thumbnail to absolute URL
    const thumbnail = thumb.startsWith('http')
      ? thumb
      : `https://${subdomain}.publicjailrecords.com/${thumb.replace(/^\/+/, '')}`;

    records.push({
      id,
      name: name || 'Unknown',
      thumbnail,
      bookingDate: dateText || 'N/A',
      detailUrl: `${baseUrl(subdomain)}/arrest.php?subject=${id}`,
    });
  });

  return records;
}

/**
 * Scrape a single arrest detail page for full information.
 * @param {string} subdomain
 * @param {string} subjectId
 * @returns {Promise<{name:string, bookingDate:string, agency:string, location:string, charges:string[], image:string}>}
 */
async function scrapeArrestDetail(subdomain, subjectId) {
  const url = `${baseUrl(subdomain)}/arrest.php?subject=${subjectId}`;
  const { data: html } = await http.get(url);
  const $ = cheerio.load(html);

  const name = $('h4').first().text().trim() || 'Unknown';
  const bookingDate = $('p.text-muted.size-12, .text-muted').first().text().trim() || 'N/A';

  // Tags usually hold agency and location
  const tags = [];
  $('.tag, .badge').each((_i, el) => {
    const t = $(el).text().trim();
    if (t) tags.push(t);
  });
  const agency = tags[0] || 'N/A';
  const location = tags[1] || 'N/A';

  // Charges: text block with <br> separators
  const chargesRaw = $('p.text-muted').last().html() || '';
  const charges = chargesRaw
    .split(/<br\s*\/?>/)
    .map((c) => cheerio.load(c).text().trim())
    .filter(Boolean);

  // Full-size mugshot
  const imgEl = $('img[src*="jailimages"]').first();
  let image = imgEl.attr('src') || '';
  if (image && !image.startsWith('http')) {
    image = `https://${subdomain}.publicjailrecords.com/${image.replace(/^\/+/, '')}`;
  }

  return { name, bookingDate, agency, location, charges, image };
}

module.exports = { scrapeRecentList, scrapeArrestDetail, baseUrl };
