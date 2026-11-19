import { z } from 'zod';
import { InternalServerError, ValidationError } from '@tryghost/errors';
import {
  RESOURCE_TYPES,
  decodeMember,
  encodeMember,
  type PresenceStore,
  type ResourceType,
  type StoredClaim,
  type StoredPresence,
} from './presence-store';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
const resourceSchema = z.object({ id: objectId, type: z.enum(RESOURCE_TYPES) }).strict();
/** Chosen by the client for one editor tab. No colon: that separates the parts of a member. */
const tabId = z.string().regex(/^[a-z0-9-]{8,36}$/i);
const pollSchema = z
  .object({
    resources: z.array(resourceSchema).max(50).default([]),
    editing: resourceSchema.optional(),
    tab: tabId.optional(),
    /** `hold` keeps or joins a place in the edited document's queue; `take` moves to its front. */
    lease: z.enum(['hold', 'take', 'watch']).optional(),
  })
  .strict()
  .refine((value) => !value.lease || value.editing, {
    path: ['lease'],
    message: 'A lease needs the document being edited',
  });
const leaveSchema = z.object({ resource: resourceSchema, tab: tabId.optional() }).strict();

export interface ActivePresence {
  userId: string;
  resourceId: string;
  resourceType: ResourceType;
  ts: number;
}

export interface PresenceLease {
  /** The user whose tab may edit the document now. */
  userId: string;
  /** Whether that tab is the caller's. False for the caller's other tabs. */
  mine: boolean;
}

export interface PollResult {
  active: ActivePresence[];
  /** Present when the caller asked about the lease on the document it is editing; null while nobody holds it. */
  lease?: PresenceLease | null;
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
  /** A queued tab keeps its place in a lease queue while its last heartbeat is newer than this. */
  leaseWindowMs?: number;
  /** Members older than this are dropped from the store. */
  retentionMs?: number;
  storeTimeoutMs?: number;
}

export const DEFAULT_ACTIVE_WINDOW_MS = 60_000;
/** Longer than the active window: a hidden tab's timers slow to one a minute, and it must not lose its place. */
export const DEFAULT_LEASE_WINDOW_MS = 150_000;
export const DEFAULT_RETENTION_MS = DEFAULT_LEASE_WINDOW_MS;
/** A retention below the lease window trims members that still hold a place in a queue. */
export const MIN_RETENTION_MS = DEFAULT_LEASE_WINDOW_MS;
/** A store call past this answers 503; ioredis has no deadline of its own on a stalled connection. */
export const DEFAULT_STORE_TIMEOUT_MS = 2_000;

/** The `ttl` (seconds) on the `cache:presence` adapter, or the default when absent or invalid. */
export function resolveRetentionMs(ttlSeconds: unknown): number {
  if (typeof ttlSeconds !== 'number' || !Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return DEFAULT_RETENTION_MS;
  }
  return Math.max(MIN_RETENTION_MS, Math.round(ttlSeconds * 1000));
}

type StoreOperation = 'touch' | 'read' | 'remove' | 'claim' | 'claims' | 'release';

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

function isFor(member: string, resource: { id: string; type: ResourceType }): boolean {
  const decoded = decodeMember(member);
  return decoded?.type === resource.type && decoded.resourceId === resource.id;
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
  private readonly leaseWindowMs: number;
  private readonly retentionMs: number;
  private readonly storeTimeoutMs: number;

  constructor(options: EditorPresenceServiceOptions) {
    this.store = options.store;
    this.now = options.now ?? Date.now;
    this.metrics = options.metrics;
    this.activeWindowMs = options.activeWindowMs ?? DEFAULT_ACTIVE_WINDOW_MS;
    this.leaseWindowMs = options.leaseWindowMs ?? DEFAULT_LEASE_WINDOW_MS;
    this.retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
    this.storeTimeoutMs = options.storeTimeoutMs ?? DEFAULT_STORE_TIMEOUT_MS;
  }

  get storeKind(): PresenceStore['kind'] {
    return this.store.kind;
  }

  /**
   * Record that `userId` has `editing` open, then return everyone else active on
   * the requested resources. Callers see only the ids they asked about. `tab`
   * keeps each of the caller's editor tabs as its own member, so closing one
   * does not clear the others. With `lease`, the caller's tab also queues for
   * the document, and the answer names the tab at the front.
   */
  async poll(userId: string, input: unknown): Promise<PollResult> {
    const { resources, editing, tab, lease } = parse(pollSchema, input);
    const now = this.now();

    const requested = new Set(resources.map((resource) => resource.id));
    if (editing) {
      requested.add(editing.id);
    }
    if (requested.size === 0) {
      return { active: [], serverTime: now };
    }

    const started = performance.now();
    const measured = { write: Boolean(editing), lease: lease ?? 'none' };
    try {
      const caller =
        editing && encodeMember({ type: editing.type, resourceId: editing.id, userId, tab });
      if (caller) {
        await this.fromStore('touch', () => this.store.touch(caller, now, this.retentionMs));
      }
      // Claims are read before heartbeats: every claim seen had its heartbeat written first.
      const claims =
        caller && editing && lease ? await this.queue(caller, lease, editing, now) : undefined;
      const window = claims
        ? Math.max(this.activeWindowMs, this.leaseWindowMs)
        : this.activeWindowMs;
      const stored = await this.fromStore('read', () => this.store.read(now - window));
      const held =
        claims && caller && editing
          ? await this.holder(claims, stored, editing, caller, now)
          : undefined;
      this.record('presence-poll', started, { outcome: 'ok', ...measured });

      // A user with the document open in several tabs is reported once, with the latest heartbeat.
      const activeSince = now - this.activeWindowMs;
      const latest = new Map<string, ActivePresence>();
      for (const { member, ts } of stored) {
        const decoded = decodeMember(member);
        if (
          ts < activeSince ||
          !decoded ||
          decoded.userId === userId ||
          !requested.has(decoded.resourceId)
        ) {
          continue;
        }
        const key = `${decoded.resourceId}:${decoded.userId}`;
        const seen = latest.get(key);
        if (!seen || ts > seen.ts) {
          latest.set(key, {
            userId: decoded.userId,
            resourceId: decoded.resourceId,
            resourceType: decoded.type,
            ts,
          });
        }
      }
      return {
        active: [...latest.values()],
        ...(claims ? { lease: held ?? null } : {}),
        serverTime: now,
      };
    } catch (error) {
      this.record('presence-poll', started, { outcome: 'error', ...measured });
      throw error;
    }
  }

  /** `take` moves the caller ahead of everyone queued for the document; `hold` keeps or joins a place. */
  private async queue(
    caller: string,
    mode: 'hold' | 'take' | 'watch',
    resource: { id: string; type: ResourceType },
    now: number,
  ): Promise<StoredClaim[]> {
    if (mode === 'watch') {
      // A tab that only watches gives up any place it held, so it is never handed the lease.
      await this.fromStore('release', () => this.store.release([caller]));
      return this.fromStore('claims', () => this.store.claims());
    }
    if (mode === 'take') {
      const queued = await this.fromStore('claims', () => this.store.claims());
      const ahead = queued
        .filter(({ member }) => member !== caller && isFor(member, resource))
        .map(({ order }) => order);
      if (ahead.length > 0) {
        const front = Math.min(...ahead) - 1;
        return this.fromStore('claim', () =>
          this.store.claim(caller, front, this.retentionMs, true),
        );
      }
    }
    return this.fromStore('claim', () => this.store.claim(caller, now, this.retentionMs));
  }

  /**
   * The first member in a document's queue that still heartbeats holds its
   * lease. Claims whose member stopped are dropped, so the next in line moves up.
   */
  private async holder(
    claims: StoredClaim[],
    stored: StoredPresence[],
    resource: { id: string; type: ResourceType },
    caller: string,
    now: number,
  ): Promise<PresenceLease | undefined> {
    const since = now - this.leaseWindowMs;
    const live = new Set(stored.filter(({ ts }) => ts >= since).map(({ member }) => member));
    const stale: string[] = [];
    let first: StoredClaim | undefined;
    for (const claim of claims) {
      if (!live.has(claim.member)) {
        stale.push(claim.member);
      } else if (
        isFor(claim.member, resource) &&
        (!first ||
          claim.order < first.order ||
          (claim.order === first.order && claim.member < first.member))
      ) {
        first = claim;
      }
    }
    if (stale.length > 0) {
      await this.fromStore('release', () => this.store.release(stale));
    }
    const decoded = first && decodeMember(first.member);
    return decoded ? { userId: decoded.userId, mine: first?.member === caller } : undefined;
  }

  async leave(userId: string, input: unknown): Promise<void> {
    const { resource, tab } = parse(leaveSchema, input);
    const started = performance.now();
    try {
      await this.fromStore('remove', () =>
        this.store.remove(
          encodeMember({ type: resource.type, resourceId: resource.id, userId, tab }),
        ),
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
