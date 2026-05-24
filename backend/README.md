# Webhook Delivery Engine — Backend

Node.js API that ingests events, delivers them to customer webhook URLs via HTTP POST, and retries failed deliveries on a fixed schedule — without any external queue library.

## Tech stack

- **Node.js** + **Express.js**
- **SQLite** via Node’s built-in **`node:sqlite`**
- **axios** for outbound HTTP requests
- **crypto** (built-in) for HMAC-SHA256 signing

> Retry scheduling uses `setInterval` polling and SQLite-backed `next_attempt_at` timestamps (no queue library).

## Structure

```
backend/
  package.json
  src/
    server.js      # Express entry; starts background worker
    db.js          # SQLite schema and data access
    worker.js      # Delivery worker (1-second polling)
    delivery.js    # HTTP delivery + HMAC signing
    routes.js      # REST API routes
    config.js      # Configuration constants
```

## Setup

### Prerequisites

- Node.js 22.5 or later

### Install and run

```bash
cd backend
npm install
npm start
```

API: **http://localhost:3000**. The delivery worker starts with the server.

### Local webhook receiver (port 4000)

The dashboard defaults to `http://localhost:4000/webhook`. Start a test receiver **before** sending events:

```bash
cd backend
npm run receiver
```

If you see `HTTP N/A` or `ECONNREFUSED` in the worker logs, nothing is listening on that URL.

To clear old queued events and start fresh, stop the server and delete `backend/webhook_delivery.db` (and `.db-shm` / `.db-wal` if present).

## API endpoints

### POST /events

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment.failed",
    "payload": { "example": "data" },
    "webhook_url": "https://customer-server.com/webhook"
  }'
```

### GET /events

```bash
curl http://localhost:3000/events
```

### GET /events/:id

```bash
curl http://localhost:3000/events/<event-id>
```

### POST /events/:id/retry

Requeue a **dead** event. Returns 400 if not dead, 404 if not found.

```bash
curl -X POST http://localhost:3000/events/<event-id>/retry
```

## Delivery engine

The worker polls SQLite every **1 second** for events where:

- `status` is `"pending"` or `"failed"`, and
- `next_attempt_at` is `NULL` or in the past

### Retry schedule

| Failed attempt | Status after failure | Next retry        |
|----------------|----------------------|-------------------|
| 1              | `failed`             | now + 30 seconds  |
| 2              | `failed`             | now + 5 minutes   |
| 3              | `failed`             | now + 30 minutes  |
| 4              | `dead`               | none              |

After **4 failed attempts**, the event is `"dead"`. Any **2xx** response marks it `"delivered"`.

## HMAC signing

Secret (default): `dev_webhook_secret_change_me`

Outgoing header: `X-Webhook-Signature: sha256=<hex_digest>`

## Environment variables

| Variable                 | Default                        | Description              |
|--------------------------|--------------------------------|--------------------------|
| `PORT`                   | `3000`                         | API server port          |
| `DB_PATH`                | `./webhook_delivery.db`        | SQLite file (in `backend/`) |
| `WEBHOOK_SIGNING_SECRET` | `dev_webhook_secret_change_me` | HMAC signing secret      |

## Troubleshooting `npm install` on Windows

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
```

This project uses `node:sqlite` (no `better-sqlite3` / native build tools required).
