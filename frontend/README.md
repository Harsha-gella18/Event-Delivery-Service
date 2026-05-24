# Webhook Delivery Engine — Frontend

React dashboard for ingesting webhook events and monitoring delivery status.

## Tech stack

- React 19 + Vite
- Tailwind CSS v4

## Setup

Start the **backend** first (`cd ../backend && npm start`), then:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/events` and `/health` to `http://localhost:3000`.

## Production build

```bash
npm run build
npm run preview
```

Set `VITE_API_URL` if the API is on another host (e.g. `VITE_API_URL=http://localhost:3000`).

## Features

- Create events (type, webhook URL, JSON payload)
- Live event list with status badges
- Delivery attempt timeline
- Manual retry for dead events
