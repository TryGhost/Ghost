import { PostPresenceService } from './post-presence-service';
import { supportsEventLog } from '@tryghost/adapter-base-cache';
import MemoryEventLog from '../../adapters/cache/MemoryEventLog';
// Use the same CommonJS constructor as the adapter manager.
const MemoryCache = require('../../adapters/cache/MemoryCache');

let service: PostPresenceService | undefined;

export function init({ cache, siteId }: { cache: unknown; siteId: string }) {
  // Give the built-in memory cache event support only for this service.
  const eventCache =
    cache instanceof MemoryCache && Object.getPrototypeOf(cache) === MemoryCache.prototype
      ? new MemoryEventLog()
      : cache;
  // Disable presence if the selected adapter cannot store events.
  service = supportsEventLog(eventCache) ? new PostPresenceService(eventCache, siteId) : undefined;
}

export function getService() {
  return service;
}
