import { AlarmEvent } from '../models/types';

const STORAGE_KEY = 'alarme_events';
const MAX_EVENTS = 1000;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function loadEvents(): AlarmEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const events = JSON.parse(raw) as AlarmEvent[];
    const cutoff = Date.now() - MAX_AGE_MS;
    return Array.isArray(events) ? events.filter((e) => e.ts > cutoff) : [];
  } catch {
    return [];
  }
}

export function appendEvent(events: AlarmEvent[], event: AlarmEvent): AlarmEvent[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  const next = [...events, event].filter((e) => e.ts > cutoff).slice(-MAX_EVENTS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function clearStoredEvents(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
