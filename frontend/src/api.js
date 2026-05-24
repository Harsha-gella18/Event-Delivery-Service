const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export function fetchEvents() {
  return request('/events');
}

export function fetchEvent(id) {
  return request(`/events/${id}`);
}

export function createEvent(body) {
  return request('/events', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function retryEvent(id) {
  return request(`/events/${id}/retry`, { method: 'POST' });
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.ok;
}
