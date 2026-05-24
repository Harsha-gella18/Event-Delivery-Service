const express = require('express');
const config = require('./config');
const routes = require('./routes');
const { startWorker } = require('./worker');

const app = express();

app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.options('*', (_req, res) => {
  res.sendStatus(204);
});

app.use(express.json());
app.use(routes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(config.PORT, () => {
  console.log(`Webhook Delivery Engine listening on http://localhost:${config.PORT}`);
  console.log(
    '[hint] Events default to http://localhost:4000/webhook — run `npm run receiver` in another terminal'
  );
  startWorker();
});
