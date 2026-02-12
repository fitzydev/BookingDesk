/**
 * Simple JSON-file–based persistence.
 * Keeps config settings, seen record IDs, and DM subscriptions.
 *
 * Config keys are either "guild:<id>" (channel delivery) or "user:<id>" (DM delivery).
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

/* ── helpers ── */

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson(file, fallback = {}) {
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch {
    return fallback;
  }
}

function saveJson(file, data) {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

/**
 * Derive the config key from an interaction.
 * Guild context → "guild:<guildId>",  DM / user-install → "user:<userId>"
 */
function configKeyFromInteraction(interaction) {
  return interaction.guildId
    ? `guild:${interaction.guildId}`
    : `user:${interaction.user.id}`;
}

/* ══════════════════════════════════════════
   Config settings  (per guild or per user)
   ══════════════════════════════════════════ */

const SETTINGS_FILE = 'settings.json';

/**
 * @typedef {Object} ConfigSettings
 * @property {string|null} channelId         - Channel to post in (null = DM delivery)
 * @property {number}      intervalMinutes   - Scrape interval
 * @property {string[]}    trackedSubdomains - County subdomains to watch
 * @property {string}      delivery          - 'channel' | 'dm'
 * @property {string}      ownerId           - User who created this config (for DM delivery)
 */

/** Get settings for a config key */
function getSettings(configKey) {
  const all = loadJson(SETTINGS_FILE);
  return all[configKey] ?? null;
}

/** Save / update settings for a config key */
function setSettings(configKey, settings) {
  const all = loadJson(SETTINGS_FILE);
  all[configKey] = { ...(all[configKey] ?? {}), ...settings };
  saveJson(SETTINGS_FILE, all);
  return all[configKey];
}

/** Get all configured entries */
function getAllSettings() {
  return loadJson(SETTINGS_FILE);
}

/* ══════════════════════════════════════
   Seen records  (deduplication)
   ══════════════════════════════════════ */

const SEEN_FILE = 'seen.json';

/**
 * Returns the set of seen record IDs for a configKey+subdomain pair.
 * @param {string} configKey
 * @param {string} subdomain
 * @returns {Set<string>}
 */
function getSeenIds(configKey, subdomain) {
  const all = loadJson(SEEN_FILE);
  const key = `${configKey}:${subdomain}`;
  return new Set(all[key] ?? []);
}

/** Mark an array of record IDs as seen */
function markSeen(configKey, subdomain, ids) {
  const all = loadJson(SEEN_FILE);
  const key = `${configKey}:${subdomain}`;
  const existing = new Set(all[key] ?? []);
  for (const id of ids) existing.add(id);
  // Keep only the last 5000 per key to limit file size
  all[key] = [...existing].slice(-5000);
  saveJson(SEEN_FILE, all);
}

/* ══════════════════════════════════════
   DM Subscriptions
   ══════════════════════════════════════ */

const SUBS_FILE = 'subscriptions.json';

/**
 * @typedef {Object} Subscription
 * @property {string} userId
 * @property {string} subdomain
 * @property {string} state
 * @property {string} county
 */

/** Get all subscriptions */
function getSubscriptions() {
  return loadJson(SUBS_FILE, []);
}

/** Add a subscription (no duplicates) */
function addSubscription(userId, subdomain, state, county) {
  const subs = getSubscriptions();
  const exists = subs.some(
    (s) => s.userId === userId && s.subdomain === subdomain,
  );
  if (exists) return false;
  subs.push({ userId, subdomain, state, county });
  saveJson(SUBS_FILE, subs);
  return true;
}

/** Remove a subscription */
function removeSubscription(userId, subdomain) {
  let subs = getSubscriptions();
  const before = subs.length;
  subs = subs.filter(
    (s) => !(s.userId === userId && s.subdomain === subdomain),
  );
  saveJson(SUBS_FILE, subs);
  return subs.length < before;
}

/** Get all subscriptions for a specific user */
function getUserSubscriptions(userId) {
  return getSubscriptions().filter((s) => s.userId === userId);
}

/** Get all subscribers for a specific subdomain */
function getSubscribersForSubdomain(subdomain) {
  return getSubscriptions().filter((s) => s.subdomain === subdomain);
}

module.exports = {
  configKeyFromInteraction,
  getSettings,
  setSettings,
  getAllSettings,
  getSeenIds,
  markSeen,
  addSubscription,
  removeSubscription,
  getUserSubscriptions,
  getSubscribersForSubdomain,
};
