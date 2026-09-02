import type { PostStatus } from '@tryghost/admin-x-framework/api/posts';

export type { PostStatus };

export const AUTOSAVE_DEBOUNCE_MS = 3000;
export const TIMED_SAVE_INTERVAL_MS = 60000;

export type SaveIntent =
  | 'autosave'
  | 'timed'
  | 'field'
  | 'explicit'
  | 'leave'
  | 'publish'
  | 'revert';

// Coalescing ladder: the higher number wins the pending slot.
const PRIORITY: Record<SaveIntent, number> = {
  autosave: 0,
  timed: 1,
  field: 2,
  leave: 3,
  explicit: 4,
  publish: 5,
  revert: 5,
};

export function isBackgroundIntent(intent: SaveIntent): boolean {
  return intent === 'autosave' || intent === 'timed' || intent === 'field';
}

export interface SaveSnapshot {
  /** null until the create request has succeeded */
  id: string | null;
  isNew: boolean;
  status: PostStatus;
  /** ISO 8601 or null */
  publishedAt: string | null;
  willPublish: boolean;
  willSchedule: boolean;
  isDirty: boolean;
  changedSinceLastRevision: boolean;
  /** Monotonic local edit counter; validation/host-limit suppression lifts once it moves. */
  version: number;
}

export interface SaveRequest<S extends SaveSnapshot = SaveSnapshot> {
  intent: SaveIntent;
  snapshot: S;
  status: PostStatus;
  publishedAt: string | null;
  saveRevision: boolean;
}

export interface SaveResult {
  id: string;
  status: PostStatus;
  updatedAt: string;
}

export type SaveErrorKind =
  | 'session-invalid'
  | 'not-found'
  | 'host-limit'
  | 'transport'
  | 'validation'
  | 'unknown';

export interface SaveError {
  kind: SaveErrorKind;
  message: string;
  cause?: unknown;
}

export type SaveOutcome = { ok: true; result: SaveResult } | { ok: false; error: SaveError };

export type DropReason = 'not-draft' | 'clean' | 'suppressed' | 'halted' | 'disposed';

export type SaveCompletion =
  | { kind: 'saved'; result: SaveResult }
  | { kind: 'failed'; error: SaveError }
  | { kind: 'dropped'; reason: DropReason };

export type SaveEngineState =
  | { kind: 'idle' }
  | { kind: 'debouncing' }
  | { kind: 'saving'; intent: SaveIntent }
  | { kind: 'pending-coalesced'; intent: SaveIntent; pending: SaveIntent }
  | { kind: 'reauth-pending'; intent: SaveIntent }
  | { kind: 'error'; intent: SaveIntent; error: SaveError }
  | { kind: 'halted' }
  | { kind: 'crashed' }
  // Reserved for server-side OCC; posts are last-write-wins today so it is never entered.
  | { kind: 'conflict' };

export type LeaveDecision = 'proceed' | 'confirm';

export interface SaveEnginePorts<S extends SaveSnapshot = SaveSnapshot> {
  getSnapshot: () => S;
  /** The only IO port. A rejected promise is treated as an `unknown` error. */
  execute: (request: SaveRequest<S>) => Promise<SaveOutcome>;
  now?: () => number;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
  onStateChange?: (state: SaveEngineState) => void;
}

export interface SaveEngine {
  dispatch(intent: SaveIntent): Promise<SaveCompletion>;
  getState(): SaveEngineState;
  subscribe(listener: (state: SaveEngineState) => void): () => void;
  reauthSucceeded(): void;
  leaveRequested(): Promise<LeaveDecision>;
  dispose(): void;
}

export type StatusInputs = Pick<
  SaveSnapshot,
  'status' | 'publishedAt' | 'willPublish' | 'willSchedule'
>;

export function zeroMilliseconds(iso: string | null): string | null {
  if (iso === null) {
    return null;
  }
  const time = Date.parse(iso);
  if (Number.isNaN(time)) {
    return iso;
  }
  return new Date(time - (time % 1000)).toISOString();
}

function isPastScheduledTime(snapshot: StatusInputs, now: number): boolean {
  if (snapshot.status !== 'scheduled' || snapshot.publishedAt === null) {
    return false;
  }
  const publishedAt = Date.parse(zeroMilliseconds(snapshot.publishedAt) ?? '');
  return !Number.isNaN(publishedAt) && publishedAt < now;
}

export function resolveStatus(snapshot: StatusInputs, intent: SaveIntent, now: number): PostStatus {
  if (isBackgroundIntent(intent)) {
    return 'draft';
  }
  if (intent === 'leave') {
    return snapshot.status;
  }
  if (intent === 'revert') {
    return 'draft';
  }
  if (intent === 'publish') {
    return snapshot.willSchedule ? 'scheduled' : 'published';
  }
  switch (snapshot.status) {
    case 'draft':
      if (snapshot.willPublish) {
        return 'published';
      }
      return snapshot.willSchedule ? 'scheduled' : 'draft';
    case 'published':
      return 'published';
    case 'sent':
      return 'sent';
    case 'scheduled':
      if (isPastScheduledTime(snapshot, now)) {
        return snapshot.willPublish || snapshot.willSchedule ? 'published' : 'draft';
      }
      return 'scheduled';
  }
}

type Waiter = (completion: SaveCompletion) => void;

interface Slot {
  intent: SaveIntent;
  waiters: Waiter[];
}

interface Timer {
  handle: unknown;
  waiters: Waiter[];
}

function dropped(reason: DropReason): SaveCompletion {
  return { kind: 'dropped', reason };
}

function settle(waiters: Waiter[], completion: SaveCompletion): void {
  for (const waiter of waiters) {
    waiter(completion);
  }
}

function higherPriority(current: SaveIntent, incoming: SaveIntent): SaveIntent {
  return PRIORITY[incoming] > PRIORITY[current] ? incoming : current;
}

function toSaveError(cause: unknown): SaveError {
  const message = cause instanceof Error ? cause.message : 'Save failed';
  return { kind: 'unknown', message, cause };
}

export function createSaveEngine<S extends SaveSnapshot = SaveSnapshot>(
  ports: SaveEnginePorts<S>,
): SaveEngine {
  const now = ports.now ?? (() => Date.now());
  const schedule = ports.setTimeout ?? ((fn, ms) => globalThis.setTimeout(fn, ms));
  const cancel = ports.clearTimeout ?? ((handle) => globalThis.clearTimeout(handle as number));
  const listeners = new Set<(state: SaveEngineState) => void>();

  let state: SaveEngineState = { kind: 'idle' };
  let inFlight: Slot | null = null;
  let pending: Slot | null = null;
  // Set while re-authentication is pending: the failed slot, and the reason the queue is frozen.
  let resume: Slot | null = null;
  let debounce: Timer | null = null;
  let timedCycle: Timer | null = null;
  let suppressedVersion: number | null = null;
  let disposed = false;

  function setState(next: SaveEngineState): void {
    state = next;
    ports.onStateChange?.(state);
    for (const listener of listeners) {
      listener(state);
    }
  }

  function isTerminal(): boolean {
    return state.kind === 'halted' || state.kind === 'crashed';
  }

  function deriveState(): SaveEngineState {
    if (resume || isTerminal()) {
      return state;
    }
    if (inFlight) {
      return pending
        ? { kind: 'pending-coalesced', intent: inFlight.intent, pending: pending.intent }
        : { kind: 'saving', intent: inFlight.intent };
    }
    if (debounce || timedCycle) {
      return { kind: 'debouncing' };
    }
    return state.kind === 'error' ? state : { kind: 'idle' };
  }

  function isSuppressed(snapshot: S): boolean {
    return suppressedVersion !== null && snapshot.version === suppressedVersion;
  }

  // Any save start cancels both timers; their waiters chain into the save that supersedes them.
  function clearTimers(into: Waiter[]): void {
    for (const timer of [debounce, timedCycle]) {
      if (timer) {
        cancel(timer.handle);
        into.push(...timer.waiters);
      }
    }
    debounce = null;
    timedCycle = null;
  }

  function restartDebounce(waiter: Waiter): void {
    const waiters = debounce ? debounce.waiters : [];
    if (debounce) {
      cancel(debounce.handle);
    }
    waiters.push(waiter);
    const handle = schedule(() => {
      debounce = null;
      enqueue('autosave', waiters);
    }, AUTOSAVE_DEBOUNCE_MS);
    debounce = { handle, waiters };
    setState(deriveState());
  }

  function armTimedCycle(waiter?: Waiter): void {
    if (timedCycle) {
      if (waiter) {
        timedCycle.waiters.push(waiter);
      }
      return;
    }
    const waiters = waiter ? [waiter] : [];
    const handle = schedule(() => {
      timedCycle = null;
      enqueue('timed', waiters);
    }, TIMED_SAVE_INTERVAL_MS);
    timedCycle = { handle, waiters };
    setState(deriveState());
  }

  function enqueue(intent: SaveIntent, waiters: Waiter[]): void {
    if (inFlight || resume) {
      if (pending) {
        pending.intent = higherPriority(pending.intent, intent);
        pending.waiters.push(...waiters);
      } else {
        pending = { intent, waiters };
      }
      if (!resume) {
        setState(deriveState());
      }
      return;
    }
    void run({ intent, waiters });
  }

  function drain(): void {
    const next = pending;
    pending = null;
    if (next) {
      void run(next);
    } else {
      setState(deriveState());
    }
  }

  async function run(slot: Slot): Promise<void> {
    clearTimers(slot.waiters);
    const snapshot = ports.getSnapshot();

    if (isBackgroundIntent(slot.intent)) {
      let reason: DropReason | null = null;
      if (snapshot.status !== 'draft') {
        reason = 'not-draft';
      } else if (!snapshot.isDirty) {
        reason = 'clean';
      } else if (isSuppressed(snapshot)) {
        reason = 'suppressed';
      }
      if (reason) {
        settle(slot.waiters, dropped(reason));
        drain();
        return;
      }
    }

    inFlight = slot;
    setState(deriveState());

    const request: SaveRequest<S> = {
      intent: slot.intent,
      snapshot,
      status: resolveStatus(snapshot, slot.intent, now()),
      publishedAt: zeroMilliseconds(snapshot.publishedAt),
      saveRevision: slot.intent === 'explicit' || slot.intent === 'leave',
    };

    let outcome: SaveOutcome;
    try {
      outcome = await ports.execute(request);
    } catch (cause) {
      outcome = { ok: false, error: toSaveError(cause) };
    }

    if (disposed) {
      return;
    }
    inFlight = null;

    if (outcome.ok) {
      suppressedVersion = null;
      settle(slot.waiters, { kind: 'saved', result: outcome.result });
      drain();
      return;
    }
    handleError(slot, snapshot, outcome.error);
  }

  function handleError(slot: Slot, snapshot: S, error: SaveError): void {
    if (error.kind === 'session-invalid') {
      resume = slot;
      setState({ kind: 'reauth-pending', intent: slot.intent });
      return;
    }

    if (error.kind === 'not-found') {
      const dropWaiters: Waiter[] = [];
      clearTimers(dropWaiters);
      if (pending) {
        dropWaiters.push(...pending.waiters);
        pending = null;
      }
      settle(dropWaiters, dropped('halted'));
      settle(slot.waiters, { kind: 'failed', error });
      setState({ kind: snapshot.id ? 'halted' : 'crashed' });
      return;
    }

    if (error.kind === 'validation' || error.kind === 'host-limit') {
      suppressedVersion = snapshot.version;
    }
    settle(slot.waiters, { kind: 'failed', error });
    setState({ kind: 'error', intent: slot.intent, error });

    if (pending) {
      const next = pending;
      pending = null;
      void run(next);
    }
  }

  function dispatch(intent: SaveIntent): Promise<SaveCompletion> {
    return new Promise<SaveCompletion>((resolve) => {
      if (disposed) {
        resolve(dropped('disposed'));
        return;
      }
      if (isTerminal()) {
        resolve(dropped('halted'));
        return;
      }

      if (!isBackgroundIntent(intent)) {
        const waiters: Waiter[] = [resolve];
        clearTimers(waiters);
        enqueue(intent, waiters);
        return;
      }

      const snapshot = ports.getSnapshot();
      if (snapshot.status !== 'draft') {
        resolve(dropped('not-draft'));
        return;
      }
      if (isSuppressed(snapshot)) {
        resolve(dropped('suppressed'));
        return;
      }

      if (intent === 'field') {
        enqueue('field', [resolve]);
        return;
      }
      if (intent === 'timed') {
        armTimedCycle(resolve);
        return;
      }
      armTimedCycle();
      if (snapshot.isNew) {
        enqueue('autosave', [resolve]);
        return;
      }
      restartDebounce(resolve);
    });
  }

  function reauthSucceeded(): void {
    if (!resume || disposed) {
      return;
    }
    const slot = resume;
    resume = null;
    if (pending) {
      pending.intent = higherPriority(pending.intent, slot.intent);
      pending.waiters.push(...slot.waiters);
    } else {
      pending = slot;
    }
    drain();
  }

  function queueSettled(): Promise<SaveCompletion> {
    const slot = pending ?? inFlight;
    if (!slot) {
      return Promise.resolve(dropped('clean'));
    }
    return new Promise<SaveCompletion>((resolve) => {
      slot.waiters.push(resolve);
    });
  }

  function shouldSaveOnLeave(snapshot: S): boolean {
    return snapshot.status === 'draft' && snapshot.isDirty && snapshot.changedSinceLastRevision;
  }

  async function leaveRequested(): Promise<LeaveDecision> {
    if (disposed) {
      return 'proceed';
    }
    let snapshot = ports.getSnapshot();
    if (isTerminal() || resume) {
      return snapshot.isDirty ? 'confirm' : 'proceed';
    }

    let saveOnLeavePerformed = false;
    if (shouldSaveOnLeave(snapshot)) {
      await dispatch('leave');
      saveOnLeavePerformed = true;
      snapshot = ports.getSnapshot();
    }

    if (!snapshot.isDirty) {
      return 'proceed';
    }
    if (resume) {
      return 'confirm';
    }
    if (inFlight || pending) {
      await queueSettled();
      return 'proceed';
    }
    if (debounce || timedCycle) {
      if (saveOnLeavePerformed) {
        return 'confirm';
      }
      await dispatch('leave');
      return 'proceed';
    }
    return 'confirm';
  }

  function subscribe(listener: (state: SaveEngineState) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    const waiters: Waiter[] = [];
    clearTimers(waiters);
    for (const slot of [inFlight, pending, resume]) {
      if (slot) {
        waiters.push(...slot.waiters);
      }
    }
    inFlight = null;
    pending = null;
    resume = null;
    settle(waiters, dropped('disposed'));
    listeners.clear();
  }

  return {
    dispatch,
    getState: () => state,
    subscribe,
    reauthSucceeded,
    leaveRequested,
    dispose,
  };
}
