# Event Delivery Service

A Node.js backend that ingests events, delivers them to customer webhook URLs via HTTP POST, and retries failed deliveries on a fixed schedule — all without any external queue library.

## Tech Stack

- **Node.js** + **Express.js**
- **SQLite** via Node’s built-in **`node:sqlite`** (no native compilation required)
- **axios** for outbound HTTP requests
- **crypto** (built-in) for HMAC-SHA256 signing

> **No queue library is used.** Retry scheduling is implemented manually with `setInterval` polling and SQLite-backed `next_attempt_at` timestamps.

## Project Structure

```
webhook-delivery-engine/
  package.json
  README.md
  src/
    server.js      # Express app entry point; starts the background worker
    db.js          # SQLite schema and data access
    worker.js      # Background delivery worker (1-second polling)
    delivery.js    # HTTP delivery + HMAC signing
    routes.js      # REST API routes
    config.js      # Configuration constants
```

## Setup

### Prerequisites

- Node.js 22.5 or later (uses built-in `node:sqlite`)

### Install dependencies

```bash
cd webhook-delivery-engine
npm install
```

### Start the server

```bash
npm start
```

The API listens on **http://localhost:3000** by default. The delivery worker starts automatically alongside the server.

## API Endpoints

### POST /events

Ingest a new event. Delivery is attempted as soon as possible (within ~1 second).

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment.failed",
    "payload": { "example": "data" },
    "webhook_url": "https://customer-server.com/webhook"
  }'
```

**Response (201):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "payment.failed",
  "payload": { "example": "data" },
  "webhook_url": "https://customer-server.com/webhook",
  "status": "pending",
  "created_at": "2026-05-24T12:00:00.000Z",
  "attempts": []
}
```

### GET /events

List all events with their attempts.

```bash
curl http://localhost:3000/events
```

### GET /events/:id

Get a single event by ID, including the full attempts array.

```bash
curl http://localhost:3000/events/<event-id>
```

### POST /events/:id/retry

Manually requeue a **dead** event for immediate delivery. Returns 400 if the event is not dead, 404 if not found.

```bash
curl -X POST http://localhost:3000/events/<event-id>/retry
```

## Delivery Engine

When the server starts, a background worker begins polling SQLite every **1 second**. It finds events where:

- `status` is `"pending"` or `"failed"`, and
- `next_attempt_at` is `NULL` or in the past

The worker uses an in-memory `Set` to prevent duplicate concurrent processing of the same event.

### Retry Schedule

| Failed attempt | Status after failure | Next retry        |
|----------------|----------------------|-------------------|
| 1              | `failed`             | now + 30 seconds  |
| 2              | `failed`             | now + 5 minutes   |
| 3              | `failed`             | now + 30 minutes  |
| 4              | `dead`               | none              |

After **4 total failed attempts**, the event is marked `"dead"`. A 2xx response on any attempt immediately marks the event `"delivered"`.

A failure is any of:

- Non-2xx HTTP response
- Request timeout (5 seconds)
- Connection or network error

Every attempt is logged to the console and persisted in the `attempts` table.

## HMAC Signing

All outgoing webhook POSTs are signed with HMAC-SHA256.

**Signing secret (hardcoded):**

```
WEBHOOK_SIGNING_SECRET=dev_webhook_secret_change_me
```

**Request body sent to the customer webhook:**

```json
{
  "id": "<event-id>",
  "type": "payment.failed",
  "payload": { "example": "data" },
  "created_at": "2026-05-24T12:00:00.000Z"
}
```

The body is serialized with `JSON.stringify` and signed using Node's `crypto` module. The hex digest is sent in the header:

```
X-Webhook-Signature: sha256=<hex_digest>
```

### Verify the signature (Node.js)

```javascript
const crypto = require('crypto');

const SECRET = 'dev_webhook_secret_change_me';

function verifyWebhookSignature(rawBody, signatureHeader) {
  const expected = 'sha256=' +
    crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected)
  );
}

// In an Express receiver, use express.raw or capture the raw body:
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  if (!verifyWebhookSignature(req.body.toString(), signature)) {
    return res.status(401).send('Invalid signature');
  }
  const event = JSON.parse(req.body.toString());
  console.log('Received verified webhook:', event);
  res.status(200).send('OK');
});
```

## Testing with a Local Webhook Receiver

Use a second terminal to run a simple receiver on port 4000:

```javascript
// receiver.js
const express = require('express');
const crypto = require('crypto');

const SECRET = 'dev_webhook_secret_change_me';
const app = express();

app.use(express.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const rawBody = req.body.toString();
  const expected = 'sha256=' +
    crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');

  if (signature !== expected) {
    console.log('INVALID SIGNATURE');
    return res.status(401).send('Invalid signature');
  }

  console.log('Received webhook:', JSON.parse(rawBody));
  res.status(200).json({ received: true });
});

app.listen(4000, () => console.log('Receiver on http://localhost:4000/webhook'));
```

Then ingest an event pointing at the local receiver:

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment.failed",
    "payload": { "order_id": "12345" },
    "webhook_url": "http://localhost:4000/webhook"
  }'
```

To simulate failures, return a non-2xx status from the receiver (e.g. `res.status(500).send('fail')`) and watch the worker retry on schedule.

## Restart Behavior

- **SQLite persists** all events and delivery attempts across restarts.
- **`next_attempt_at`** is stored in the database, so scheduled retries survive process restarts.
- After restart, the worker resumes polling and picks up any `pending` or `failed` events whose `next_attempt_at` is due.
- If the process is killed while an HTTP request is in flight, that attempt may be interrupted. After restart, due events are retried by the worker on the next poll cycle.

## Environment Variables

| Variable                 | Default                        | Description              |
|--------------------------|--------------------------------|--------------------------|
| `PORT`                   | `3000`                         | API server port          |
| `DB_PATH`                | `./webhook_delivery.db`        | SQLite database file     |
| `WEBHOOK_SIGNING_SECRET` | `dev_webhook_secret_change_me` | HMAC signing secret      |

## Troubleshooting `npm install` on Windows

If a previous install failed with `better-sqlite3` / `node-gyp` errors, remove the broken install and reinstall:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
```

This project uses Node’s built-in `node:sqlite` instead of `better-sqlite3`, so Visual Studio C++ build tools are not required.

## License

Assessment project — internal use.
