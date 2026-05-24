const config = require('./config');
const db = require('./db');
const { deliverWebhook } = require('./delivery');

const processing = new Set();

function log(message) {
  console.log(`[worker] ${message}`);
}

async function processEvent(event) {
  if (processing.has(event.id)) {
    return;
  }

  processing.add(event.id);

  try {
  const attemptedAt = new Date().toISOString();
  log(`Delivering event ${event.id} to ${event.webhook_url}`);

  let httpStatus = null;
  let success = false;

  try {
    const result = await deliverWebhook(event);
    httpStatus = result.http_status;
    success = result.success;
  } catch (err) {
    log(`Delivery error for event ${event.id}: ${err.message}`);
    success = false;
  }

  db.recordAttempt(event.id, {
    attempted_at: attemptedAt,
    http_status: httpStatus,
    outcome: success ? 'success' : 'failed',
  });

  const updatedAt = new Date().toISOString();

  if (success) {
    db.markDelivered(event.id, updatedAt);
    log(`Event ${event.id} delivered successfully (HTTP ${httpStatus})`);
    return;
  }

  const newRetryCount = event.retry_count + 1;

  if (newRetryCount >= config.MAX_FAILED_ATTEMPTS) {
    db.markDead(event.id, updatedAt);
    log(
      `Event ${event.id} marked dead after ${newRetryCount} failed attempts (HTTP ${httpStatus ?? 'N/A'})`
    );
    return;
  }

  const delayMs = config.RETRY_DELAYS_MS[newRetryCount - 1];
  const nextAttemptAt = new Date(Date.now() + delayMs).toISOString();

  db.markFailed(event.id, {
    retry_count: newRetryCount,
    next_attempt_at: nextAttemptAt,
    updated_at: updatedAt,
  });

  log(
    `Event ${event.id} failed (HTTP ${httpStatus ?? 'N/A'}). Retry ${newRetryCount}/${config.MAX_FAILED_ATTEMPTS} scheduled at ${nextAttemptAt}`
  );
  } finally {
    processing.delete(event.id);
  }
}

async function poll() {
  const dueEvents = db.getDueEvents();

  for (const event of dueEvents) {
    processEvent(event).catch((err) => {
      log(`Unexpected error processing event ${event.id}: ${err.message}`);
      processing.delete(event.id);
    });
  }
}

function startWorker() {
  log('Delivery worker started (polling every 1 second, no queue library)');
  setInterval(poll, config.POLL_INTERVAL_MS);
  poll();
}

module.exports = { startWorker, processEvent };
