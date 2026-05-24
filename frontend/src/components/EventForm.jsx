import { useState } from 'react';
import { createEvent } from '../api';

const DEFAULT_PAYLOAD = '{\n  "order_id": "12345"\n}';

export default function EventForm({ onCreated }) {
  const [type, setType] = useState('payment.failed');
  const [webhookUrl, setWebhookUrl] = useState('http://localhost:4000/webhook');
  const [payloadText, setPayloadText] = useState(DEFAULT_PAYLOAD);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    let payload;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      setError('Payload must be valid JSON');
      return;
    }

    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      setError('Payload must be a JSON object');
      return;
    }

    setSubmitting(true);
    try {
      const event = await createEvent({
        type: type.trim(),
        webhook_url: webhookUrl.trim(),
        payload,
      });
      onCreated(event);
      setPayloadText(DEFAULT_PAYLOAD);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-5 shadow-lg shadow-black/20"
    >
      <h2 className="mb-4 text-lg font-semibold text-white">Send new event</h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="type" className="mb-1 block text-sm font-medium text-slate-300">
            Event type
          </label>
          <input
            id="type"
            type="text"
            required
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="payment.failed"
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="webhook_url" className="mb-1 block text-sm font-medium text-slate-300">
            Webhook URL
          </label>
          <input
            id="webhook_url"
            type="url"
            required
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://customer-server.com/webhook"
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="payload" className="mb-1 block text-sm font-medium text-slate-300">
            Payload (JSON)
          </label>
          <textarea
            id="payload"
            required
            rows={5}
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Ingest event'}
        </button>
      </div>
    </form>
  );
}
