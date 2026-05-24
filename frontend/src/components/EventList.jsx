import StatusBadge from './StatusBadge';

function formatTime(iso) {
  return new Date(iso).toLocaleString();
}

export default function EventList({ events, selectedId, onSelect }) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-12 text-center">
        <p className="text-slate-400">No events yet. Send one to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/60 shadow-lg shadow-black/20">
      <div className="border-b border-slate-700/80 px-4 py-3">
        <h2 className="text-lg font-semibold text-white">Events</h2>
        <p className="text-xs text-slate-400">{events.length} total</p>
      </div>

      <ul className="max-h-[520px] divide-y divide-slate-800 overflow-y-auto">
        {events.map((event) => {
          const selected = event.id === selectedId;
          const attemptCount = event.attempts?.length ?? 0;

          return (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onSelect(event.id)}
                className={`w-full px-4 py-3 text-left transition hover:bg-slate-800/60 ${
                  selected ? 'bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate font-medium text-white">{event.type}</span>
                  <StatusBadge status={event.status} />
                </div>
                <p className="mt-1 truncate font-mono text-xs text-slate-500">{event.id}</p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{formatTime(event.created_at)}</span>
                  <span>
                    {attemptCount} attempt{attemptCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
