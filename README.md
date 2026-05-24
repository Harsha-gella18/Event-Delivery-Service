# Event Delivery Service

Monorepo with a separate **backend** (Node.js API + delivery worker) and **frontend** (React dashboard).

## Project structure

```
webhook-delivery-engine/
  backend/          # Express API, SQLite, delivery worker
  frontend/         # React + Tailwind CSS dashboard
  package.json      # Root scripts (optional convenience)
```

## Quick start

**Prerequisites:** Node.js 22.5+

### 1. Backend (port 3000)

```bash
cd backend
npm install
npm start
```

### 2. Frontend (port 5173)

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

**502 on `/events` or `/health`?** The backend on port 3000 is not responding (stopped, or overloaded by many queued deliveries). Restart the backend, run `npm run receiver` in `backend/`, and optionally delete `backend/webhook_delivery.db` to clear old events. Restart the frontend after changing `.env`.

### Install both from the repo root

```bash
npm run install:all
npm run start:backend    # terminal 1
npm run start:frontend   # terminal 2
```

## Documentation

- [Backend API & delivery engine](backend/README.md)
- Frontend: run `npm run dev` in `frontend/` (Vite proxies API calls to `localhost:3000`)

## License

Assessment project — internal use.
