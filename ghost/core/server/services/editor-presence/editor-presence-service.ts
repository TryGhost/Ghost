import { z } from 'zod';
import { InternalServerError, TooManyRequestsError, ValidationError } from '@tryghost/errors';
import { FixedWindowLimiter } from './rate-limiter';
import {
  RESOURCE_TYPES,
  decodeMember,
  encodeMember,
  type PresenceStore,
  type ResourceType,
} from './presence-store';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
const resourceSchema = z.object({ id: objectId, type: z.enum(RESOURCE_TYPES) }).strict();
const pollSchema = z
  .object({
    resources: z.array(resourceSchema).max(50).default([]),
    editing: resourceSchema.optional(),
  })
  .strict();
const leaveSchema = z.object({ resource: resourceSchema }).strict();

export interface ActivePresence {
  userId: string;
  resourceId: string;
  resourceType: ResourceType;
  ts: number;
}

export interface PollResult {
  active: ActivePresence[];
  serverTime: number;
}

export interface PresenceMetrics {
  metric(name: string, value: Record<string, unknown>): void;
}

export interface EditorPresenceServiceOptions {
  store: PresenceStore;
  rateLimit: { limit: number; windowMs: number };
  metrics?: PresenceMetrics;
  now?: () => number;
  /** Heartbeats newer than this are reported as active. */
  activeWindowMs?: number;
  /** Members older than this are dropped from the store. */
  retentionMs?: number;
}

export const DEFAULT_ACTIVE_WINDOW_MS = 60_000;
export const DEFAULT_RETENTION_MS = 60_000;

type StoreOperation = 'touch' | 'read' | 'remove';

function failureReason(error: unknown): string {
  const details = error as { code?: unknown; name?: unknown; message?: unknown };
  if (typeof details.message === 'string' && details.message.startsWith('NOPERM')) {
    return 'noperm';
  }
  if (typeof details.code === 'string') {
    return details.code;
  }
  return typeof details.name === 'string' ? details.name : 'Error';
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    throw new ValidationError({
      message: 'Invalid presence request',
      context: result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; '),
    });
  }
  return result.data;
}

export class EditorPresenceService {
  private readonly store: PresenceStore;
  private readonly limiter: FixedWindowLimiter;
  private readonly metrics?: PresenceMetrics;
  private readonly now: () => number;
  private readonly activeWindowMs: number;
  private readonly retentionMs: number;

  constructor(options: EditorPresenceServiceOptions) {
    this.store = options.store;
    this.now = options.now ?? Date.now;
    this.limiter = new FixedWindowLimiter({ ...options.rateLimit, now: this.now });
    this.metrics = options.metrics;
    this.activeWindowMs = options.activeWindowMs ?? DEFAULT_ACTIVE_WINDOW_MS;
    this.retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
  }

  get storeKind(): PresenceStore['kind'] {
    return this.store.kind;
  }

  /**
   * Record that `userId` has `editing` open, then return everyone else active on
   * the requested resources. Callers see only the ids they asked about.
   */
  async poll(userId: string, input: unknown): Promise<PollResult> {
    this.enforceLimit(userId);
    const { resources, editing } = parse(pollSchema, input);
    const now = this.now();

    const requested = new Set(resources.map((resource) => resource.id));
    if (editing) {
      requested.add(editing.id);
    }
    if (requested.size === 0) {
      return { active: [], serverTime: now };
    }

    const started = performance.now();
    try {
      if (editing) {
        await this.fromStore('touch', () =>
          this.store.touch(
            encodeMember({ type: editing.type, resourceId: editing.id, userId }),
            now,
            this.retentionMs,
          ),
        );
      }
      const stored = await this.fromStore('read', () => this.store.read(now - this.activeWindowMs));
      this.record('presence-poll', started, { outcome: 'ok', write: Boolean(editing) });

      const active: ActivePresence[] = [];
      for (const { member, ts } of stored) {
        const decoded = decodeMember(member);
        if (!decoded || decoded.userId === userId || !requested.has(decoded.resourceId)) {
          continue;
        }
        active.push({
          userId: decoded.userId,
          resourceId: decoded.resourceId,
          resourceType: decoded.type,
          ts,
        });
      }
      return { active, serverTime: now };
    } catch (error) {
      this.record('presence-poll', started, { outcome: 'error', write: Boolean(editing) });
      throw error;
    }
  }

  async leave(userId: string, input: unknown): Promise<void> {
    this.enforceLimit(userId);
    const { resource } = parse(leaveSchema, input);
    const started = performance.now();
    try {
      await this.fromStore('remove', () =>
        this.store.remove(encodeMember({ type: resource.type, resourceId: resource.id, userId })),
      );
      this.record('presence-leave', started, { outcome: 'ok' });
    } catch (error) {
      this.record('presence-leave', started, { outcome: 'error' });
      throw error;
    }
  }

  private enforceLimit(userId: string): void {
    const decision = this.limiter.take(userId);
    if (!decision.allowed) {
      this.metrics?.metric('presence-rate-limited', { feature: 'presence' });
      throw new TooManyRequestsError({
        message: 'Too many presence requests',
        context: `Retry after ${Math.ceil(decision.retryAfterMs / 1000)}s`,
      });
    }
  }

  /** A store failure is a 503, never a 500: editing does not depend on presence and clients back off. */
  private async fromStore<T>(operation: StoreOperation, run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (error) {
      this.metrics?.metric('presence-degraded', {
        feature: 'presence',
        store: this.store.kind,
        operation,
        reason: failureReason(error),
      });
      throw new InternalServerError({
        statusCode: 503,
        errorType: 'ServiceUnavailableError',
        level: 'normal',
        message: 'Presence is temporarily unavailable',
        err: error instanceof Error ? error : undefined,
      });
    }
  }

  private record(name: string, started: number, extra: Record<string, unknown>): void {
    this.metrics?.metric(name, {
      feature: 'presence',
      store: this.store.kind,
      value: performance.now() - started,
      ...extra,
    });
  }
}
