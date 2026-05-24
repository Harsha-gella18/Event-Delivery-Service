import { useState } from 'react';
import { retryEvent } from '../api';
import StatusBadge from './StatusBadge';

function formatTime(iso) {
  return new Date(iso).toLocaleString();
}

function outcomeColor(outcome) {
  if (outcome === 'success') return 'text-emerald-400';
  if (outcome === 'timeout') return 'text-amber-400';
  return 'text-red-400';
}

export default function EventDetail({ event, onUpdated }) {
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(null);

  if (!event) {
    return (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-6">
        <p className="text-slate-400">Select an event to view details</p>
      </div>
    );
  }

  async function handleRetry() {
    setError(null);
    setRetrying(true);
    try {
      const updated = await retryEvent(event.id);
      onUpdated(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setRetrying(false);
    }
  }

  const attempts = event.attempts ?? [];

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{event.type}</h2>
          <p className="mt-1 font-mono text-xs text-slate-500 break-all">{event.id}</p>
        </div>
        <StatusBadge status={event.status} />
      </div>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-slate-400">Webhook URL</dt>
          <dd className="mt-0.5 break-all font-mono text-slate-200">{event.webhook_url}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Created</dt>
          <dd className="mt-0.5 text-slate-200">{formatTime(event.created_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Payload</dt>
          <dd className="mt-1 overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-300 ring-1 ring-slate-700">
            <pre>{JSON.stringify(event.payload, null, 2)}</pre>
          </dd>
        </div>
      </dl>

      {event.status === 'dead' && (
        <div className="mt-4 border-t border-slate-700/80 pt-4">
          {error && (
            <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-red-500/30">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {retrying ? 'Requeuing…' : 'Retry dead event'}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Manual retry resets the event to pending for immediate delivery.
          </p>
        </div>
      )}

      <div className="mt-6 border-t border-slate-700/80 pt-4">
        <h3 className="mb-3 text-sm font-semibold text-white">
          Delivery attempts ({attempts.length})
        </h3>

        {attempts.length === 0 ? (
          <p className="text-sm text-slate-500">No delivery attempts yet.</p>
        ) : (
          <ol className="space-y-2">
            {attempts.map((attempt, index) => (
              <li
                key={`${attempt.attempted_at}-${index}`}
                className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2 ring-1 ring-slate-700/80"
              >
                <div>
                  <span className="text-xs text-slate-500">#{index + 1}</span>
                  <span className="ml-2 text-sm text-slate-300">
                    {formatTime(attempt.attempted_at)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {attempt.http_status != null && (
                    <span className="font-mono text-slate-400">HTTP {attempt.http_status}</span>
                  )}
                  <span className={`font-medium capitalize ${outcomeColor(attempt.outcome)}`}>
                    {attempt.outcome}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
