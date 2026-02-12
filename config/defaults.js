module.exports = {
  /** Default scrape interval in minutes */
  DEFAULT_INTERVAL_MINUTES: 30,

  /** Minimum allowed interval in minutes */
  MIN_INTERVAL_MINUTES: 5,

  /** Maximum allowed interval in minutes */
  MAX_INTERVAL_MINUTES: 1440, // 24 hours

  /** How many records to show per embed batch (avoids rate-limits) */
  RECORDS_PER_MESSAGE: 5,

  /** User-Agent sent with HTTP requests */
  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};
