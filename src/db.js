const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

const db = new DatabaseSync(config.DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    next_attempt_at TEXT NULL,
    retry_count INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL,
    attempted_at TEXT NOT NULL,
    http_status INTEGER NULL,
    outcome TEXT NOT NULL,
    FOREIGN KEY(event_id) REFERENCES events(id)
  );

  CREATE INDEX IF NOT EXISTS idx_events_due
    ON events(status, next_attempt_at);
`);

function parsePayload(payloadStr) {
  return JSON.parse(payloadStr);
}

function rowToEvent(row, attempts = []) {
  return {
    id: row.id,
    type: row.type,
    payload: parsePayload(row.payload),
    webhook_url: row.webhook_url,
    status: row.status,
    created_at: row.created_at,
    attempts: attempts.map((a) => ({
      attempted_at: a.attempted_at,
      http_status: a.http_status,
      outcome: a.outcome,
    })),
  };
}

function getAttemptsForEvent(eventId) {
  return db
    .prepare(
      `SELECT attempted_at, http_status, outcome
       FROM attempts
       WHERE event_id = ?
       ORDER BY attempted_at ASC`
    )
    .all(eventId);
}

function getEventById(id) {
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!row) return null;
  const attempts = getAttemptsForEvent(id);
  return rowToEvent(row, attempts);
}

function getAllEvents() {
  const rows = db
    .prepare('SELECT * FROM events ORDER BY created_at DESC')
    .all();
  return rows.map((row) => {
    const attempts = getAttemptsForEvent(row.id);
    return rowToEvent(row, attempts);
  });
}

function createEvent({ id, type, payload, webhook_url, created_at }) {
  const now = created_at;
  db.prepare(
    `INSERT INTO events
       (id, type, payload, webhook_url, status, created_at, updated_at, next_attempt_at, retry_count)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, NULL, 0)`
  ).run(id, type, JSON.stringify(payload), webhook_url, now, now);

  return getEventById(id);
}

function getDueEvents() {
  const now = new Date().toISOString();
  return db
    .prepare(
      `SELECT * FROM events
       WHERE status IN ('pending', 'failed')
         AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
       ORDER BY created_at ASC`
    )
    .all(now);
}

function recordAttempt(eventId, { attempted_at, http_status, outcome }) {
  db.prepare(
    `INSERT INTO attempts (event_id, attempted_at, http_status, outcome)
     VALUES (?, ?, ?, ?)`
  ).run(eventId, attempted_at, http_status, outcome);
}

function markDelivered(eventId, updated_at) {
  db.prepare(
    `UPDATE events
     SET status = 'delivered', updated_at = ?, next_attempt_at = NULL
     WHERE id = ?`
  ).run(updated_at, eventId);
}

function markFailed(eventId, { retry_count, next_attempt_at, updated_at }) {
  db.prepare(
    `UPDATE events
     SET status = 'failed', retry_count = ?, next_attempt_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(retry_count, next_attempt_at, updated_at, eventId);
}

function markDead(eventId, updated_at) {
  db.prepare(
    `UPDATE events
     SET status = 'dead', updated_at = ?, next_attempt_at = NULL
     WHERE id = ?`
  ).run(updated_at, eventId);
}

function requeueDeadEvent(eventId, updated_at) {
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!row) return null;
  if (row.status !== 'dead') return { error: 'not_dead' };

  db.prepare(
    `UPDATE events
     SET status = 'pending', retry_count = 0, next_attempt_at = NULL, updated_at = ?
     WHERE id = ?`
  ).run(updated_at, eventId);

  return getEventById(eventId);
}

module.exports = {
  db,
  getEventById,
  getAllEvents,
  createEvent,
  getDueEvents,
  recordAttempt,
  markDelivered,
  markFailed,
  markDead,
  requeueDeadEvent,
};
