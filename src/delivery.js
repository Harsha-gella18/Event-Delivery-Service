const crypto = require('crypto');
const axios = require('axios');
const config = require('./config');

function buildWebhookBody(event) {
  return {
    id: event.id,
    type: event.type,
    payload: JSON.parse(event.payload),
    created_at: event.created_at,
  };
}

function signPayload(body) {
  const serialized = JSON.stringify(body);
  const digest = crypto
    .createHmac('sha256', config.WEBHOOK_SIGNING_SECRET)
    .update(serialized)
    .digest('hex');
  return { serialized, signature: `sha256=${digest}` };
}

async function deliverWebhook(event) {
  const body = buildWebhookBody(event);
  const { serialized, signature } = signPayload(body);

  const response = await axios.post(event.webhook_url, serialized, {
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
    },
    timeout: config.HTTP_TIMEOUT_MS,
    validateStatus: () => true,
    transformRequest: [(data) => data],
  });

  return {
    http_status: response.status,
    success: response.status >= 200 && response.status < 300,
  };
}

module.exports = {
  buildWebhookBody,
  signPayload,
  deliverWebhook,
};
