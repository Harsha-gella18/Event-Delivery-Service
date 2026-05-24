/**
 * Local webhook receiver for testing deliveries.
 * Run in a second terminal: node receiver.js
 * Then point events at http://localhost:4000/webhook
 */
const express = require('express');
const crypto = require('crypto');

const SECRET = process.env.WEBHOOK_SIGNING_SECRET || 'dev_webhook_secret_change_me';
const PORT = process.env.RECEIVER_PORT || 4000;

const app = express();
app.use(express.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const rawBody = req.body.toString();
  const expected =
    'sha256=' + crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');

  if (signature !== expected) {
    console.log('[receiver] INVALID SIGNATURE');
    return res.status(401).send('Invalid signature');
  }

  console.log('[receiver] OK', JSON.parse(rawBody));
  res.status(200).json({ received: true });
});

app.listen(PORT, () => {
  console.log(`Webhook receiver listening on http://localhost:${PORT}/webhook`);
});
