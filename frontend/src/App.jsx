import { useCallback, useEffect, useState } from 'react';
import { checkHealth, fetchEvent, fetchEvents } from './api';
import EventDetail from './components/EventDetail';
import EventForm from './components/EventForm';
import EventList from './components/EventList';

const POLL_MS = 2000;

export default function App() {
  const [events, setEvents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchEvents();
      setEvents(data);
      setLoadError(null);
      setApiOnline(true);
    } catch (err) {
      setLoadError(err.message);
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSelected = useCallback(async (id) => {
    if (!id) {
      setSelectedEvent(null);
      return;
    }
    try {
      const event = await fetchEvent(id);
      setSelectedEvent(event);
      setEvents((prev) => prev.map((e) => (e.id === id ? event : e)));
    } catch {
      setSelectedEvent(null);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, POLL_MS);
    return () => clearInterval(interval);
  }, [loadEvents]);

  useEffect(() => {
    checkHealth().then(setApiOnline).catch(() => setApiOnline(false));
  }, []);

  useEffect(() => {
    refreshSelected(selectedId);
    if (!selectedId) return undefined;
    const interval = setInterval(() => refreshSelected(selectedId), POLL_MS);
    return () => clearInterval(interval);
  }, [selectedId, refreshSelected]);

  function handleCreated(event) {
    setEvents((prev) => [event, ...prev]);
    setSelectedId(event.id);
    setSelectedEvent(event);
  }

  function handleEventUpdated(event) {
    setSelectedEvent(event);
    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/50 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Webhook Delivery Engine
            </h1>
            <p className="text-sm text-slate-400">Ingest events and monitor delivery attempts</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${apiOnline ? 'bg-emerald-400' : 'bg-red-400'}`}
            />
            <span className="text-xs text-slate-400">
              API {apiOnline ? 'connected' : 'offline'}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {!apiOnline && (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Backend not reachable. Start the API with{' '}
            <code className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-amber-100">
              npm start
            </code>{' '}
            in the <code className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-amber-100">backend</code> folder (port 3000).
          </div>
        )}

        {loadError && apiOnline && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {loadError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-12">
          <aside className="lg:col-span-4 space-y-6">
            <EventForm onCreated={handleCreated} />
            {loading ? (
              <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-6 py-8 text-center text-slate-400">
                Loading events…
              </div>
            ) : (
              <EventList
                events={events}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </aside>

          <section className="lg:col-span-8">
            <EventDetail event={selectedEvent} onUpdated={handleEventUpdated} />
          </section>
        </div>
      </main>
    </div>
  );
}
