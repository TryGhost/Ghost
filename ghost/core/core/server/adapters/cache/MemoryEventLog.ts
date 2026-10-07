import type { EventLogCache } from '@tryghost/adapter-base-cache';
import MemoryTTLCache from './AdapterCacheMemoryTTL';

type Event = { value: string; timestamp: number };

export default class MemoryEventLog extends MemoryTTLCache<Event[]> implements EventLogCache {
  constructor() {
    super({ max: 10000 });
  }

  appendEvent(key: string, value: string, timestamp: number, ttl: number, limit: number) {
    const existing: Event[] = this.get(key) ?? [];
    const events = existing.filter((event) => event.timestamp > timestamp - ttl * 1000);
    events.push({ value, timestamp });
    events.sort((a, b) => a.timestamp - b.timestamp);
    this.set(key, events.slice(-limit), { ttl: ttl * 1000 });
    return Math.min(events.length, limit);
  }

  readEvents(key: string, since: number) {
    const events: Event[] = this.get(key) ?? [];
    return events.filter((event) => event.timestamp >= since).map((event) => event.value);
  }
}
