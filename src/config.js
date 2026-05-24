const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'webhook_delivery.db'),
  WEBHOOK_SIGNING_SECRET: process.env.WEBHOOK_SIGNING_SECRET || 'dev_webhook_secret_change_me',
  POLL_INTERVAL_MS: 1000,
  HTTP_TIMEOUT_MS: 5000,
  // Delays after failed attempts 1, 2, and 3 (before the 4th failure marks the event dead)
  RETRY_DELAYS_MS: [30 * 1000, 5 * 60 * 1000, 30 * 60 * 1000],
  MAX_FAILED_ATTEMPTS: 4,
};
