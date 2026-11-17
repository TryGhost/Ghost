import { z } from 'zod';
import { InternalServerError, ValidationError } from '@tryghost/errors';
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
  metrics?: PresenceMetrics;
  now?: () => number;
  /** Heartbeats newer than this are reported as active. */
  activeWindowMs?: number;
  /** Members older than this are dropped from the store. */
  retentionMs?: number;
  storeTimeoutMs?: number;
}

export const DEFAULT_ACTIVE_WINDOW_MS = 60_000;
export const DEFAULT_RETENTION_MS = DEFAULT_ACTIVE_WINDOW_MS;
/** A retention below the active window trims members that are still reported as active. */
export const MIN_RETENTION_MS = DEFAULT_ACTIVE_WINDOW_MS;
/** A store call past this answers 503; ioredis has no deadline of its own on a stalled connection. */
export const DEFAULT_STORE_TIMEOUT_MS = 2_000;

/** The `ttl` (seconds) on the `cache:presence` adapter, or the default when absent or invalid. */
export function resolveRetentionMs(ttlSeconds: unknown): number {
  if (typeof ttlSeconds !== 'number' || !Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return DEFAULT_RETENTION_MS;
  }
  return Math.max(MIN_RETENTION_MS, Math.round(ttlSeconds * 1000));
}

type StoreOperation = 'touch' | 'read' | 'remove';

function failureReason(error: unknown): string {
  const details = error as { code?: unknown; name?: unknown; message?: unknown };
  const message = typeof details.message === 'string' ? details.message : '';
  if (message.startsWith('NOPERM')) {
    return 'noperm';
  }
  // ioredis rejects at once with this message while disconnected and enableOfflineQueue is off.
  if (message.includes('enableOfflineQueue')) {
    return 'offline';
  }
  if (typeof details.code === 'string') {
    return details.code;
  }
  // Redis replies such as READONLY, LOADING or WRONGTYPE arrive as a ReplyError with no code.
  if (details.name === 'ReplyError' && message) {
    return message.split(' ')[0].toLowerCase();
  }
  return typeof details.name === 'string' ? details.name : 'Error';
}

function withDeadline<T>(run: () => Promise<T>, ms: number): Promise<T> {
  // Started before the timer: a store that throws synchronously must not leave one armed.
  const pending = run();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new InternalServerError({
          message: `Presence store did not answer within ${ms}ms`,
          code: 'timeout',
        }),
      );
    }, ms);
  });
  return Promise.race([pending, deadline]).finally(() => clearTimeout(timer));
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError({
      message: 'Invalid presence request',
      context: result.error.issues
        .map((issue) =>
          issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
        )
        .join('; '),
    });
  }
  return result.data;
}

export class EditorPresenceService {
  private readonly store: PresenceStore;
  private readonly metrics?: PresenceMetrics;
  private readonly now: () => number;
  private readonly activeWindowMs: number;
  private readonly retentionMs: number;
  private readonly storeTimeoutMs: number;

  constructor(options: EditorPresenceServiceOptions) {
    this.store = options.store;
    this.now = options.now ?? Date.now;
    this.metrics = options.metrics;
    this.activeWindowMs = options.activeWindowMs ?? DEFAULT_ACTIVE_WINDOW_MS;
    this.retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
    this.storeTimeoutMs = options.storeTimeoutMs ?? DEFAULT_STORE_TIMEOUT_MS;
  }

  get storeKind(): PresenceStore['kind'] {
    return this.store.kind;
  }

  /**
   * Record that `userId` has `editing` open, then return everyone else active on
   * the requested resources. Callers see only the ids they asked about.
   */
  async poll(userId: string, input: unknown): Promise<PollResult> {
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

  /** A store failure is a 503, never a 500: editing does not depend on presence and clients back off. */
  private async fromStore<T>(operation: StoreOperation, run: () => Promise<T>): Promise<T> {
    try {
      return await withDeadline(run, this.storeTimeoutMs);
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
        // Set here so the store's own code (a socket error, `timeout`) stays out of the response.
        code: 'PRESENCE_UNAVAILABLE',
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
