import errors from '@tryghost/errors';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { EventLogCache } from '@tryghost/adapter-base-cache';

export const RETENTION_SECONDS = 60;
export const FRESHNESS_MS = 30000;
export const MAX_EVENTS = 2000;
const id = z.string().regex(/^[a-f\d]{24}$/i);
export const resourceSchema = z.object({ id, type: z.enum(['post', 'page']) });
export const actorSchema = z.object({
  id,
  name: z.string(),
  profile_image: z.string().nullable(),
});
export const requestSchema = z.object({
  resources: z.array(resourceSchema).min(1).max(50),
  editing: resourceSchema.optional(),
});
export const eventSchema = z.object({
  eventId: z.string().uuid(),
  userId: id,
  name: z.string(),
  avatar: z.string().nullable(),
  resourceType: z.enum(['post', 'page']),
  resourceId: id,
  ts: z.number().int().nonnegative(),
});
export type PresenceEvent = z.infer<typeof eventSchema>;
export type Resource = z.infer<typeof resourceSchema>;
export type Actor = z.infer<typeof actorSchema>;

export class PostPresenceService {
  private cache: EventLogCache;
  private siteId: string;
  private now: () => number;

  constructor(cache: EventLogCache, siteId: string, now = Date.now) {
    if (!siteId) {
      throw new errors.IncorrectUsageError({ message: 'Presence requires a stable site ID' });
    }
    this.cache = cache;
    this.siteId = siteId;
    this.now = now;
  }

  private key(resource: Resource) {
    return `presence:v1:${this.siteId}:${resource.type}:${resource.id}`;
  }

  async allowPoll(userId: string) {
    // Share the limit across replicas. Keep the 31st entry to detect overflow.
    const count = await this.cache.appendEvent(
      `presence:v1:${this.siteId}:limit:${userId}`,
      randomUUID(),
      this.now(),
      10,
      31,
    );
    return count <= 30;
  }

  async record(resource: Resource, actor: Actor) {
    const event = eventSchema.parse({
      eventId: randomUUID(),
      userId: actor.id,
      name: actor.name,
      avatar: actor.profile_image,
      resourceType: resource.type,
      resourceId: resource.id,
      ts: this.now(),
    });
    await this.cache.appendEvent(
      this.key(resource),
      JSON.stringify(event),
      event.ts,
      RETENTION_SECONDS,
      MAX_EVENTS,
    );
  }

  async recent(resources: Resource[]) {
    const now = this.now();
    const since = now - FRESHNESS_MS;
    const keys = resources.map((resource) => this.key(resource));
    const windows = this.cache.readEventsMany
      ? await this.cache.readEventsMany(keys, since)
      : await Promise.all(keys.map((key) => this.cache.readEvents(key, since)));
    const events = windows.flatMap((values, index) => {
      const resource = resources[index];
      return values.flatMap((value) => {
        try {
          const result = eventSchema.safeParse(JSON.parse(value));
          if (
            !result.success ||
            result.data.resourceId !== resource.id ||
            result.data.resourceType !== resource.type ||
            result.data.ts > now ||
            result.data.ts < since
          ) {
            return [];
          }
          return [result.data];
        } catch {
          return [];
        }
      });
    });
    // Return one heartbeat per user and resource, regardless of how many tabs are open.
    const latest = new Map<string, PresenceEvent>();
    for (const event of events) {
      const key = `${event.resourceType}:${event.resourceId}:${event.userId}`;
      const previous = latest.get(key);
      if (!previous || previous.ts < event.ts) {
        latest.set(key, event);
      }
    }
    return [...latest.values()];
  }
}
