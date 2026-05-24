const express = require('express');
const config = require('./config');
const routes = require('./routes');
const { startWorker } = require('./worker');

const app = express();

app.use(express.json());
app.use(routes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(config.PORT, () => {
  console.log(`Webhook Delivery Engine listening on http://localhost:${config.PORT}`);
  startWorker();
});
