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

/** `timed` is engine-internal: an autosave dispatch arms the 60s cycle. */
export type DispatchIntent = Exclude<SaveIntent, 'timed'>;

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

function isStatusChangingIntent(intent: SaveIntent): boolean {
  return intent === 'publish' || intent === 'revert';
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
  | { kind: 'dropped'; reason: DropReason }
  /** A contradictory status-changing intent replaced this one before it ran. */
  | { kind: 'superseded'; by: SaveIntent }
  /** Publish/revert interrupted by re-auth; the publish flow must re-confirm, never auto-fire. */
  | { kind: 'needs-retry' };

export type SaveEngineState =
  | { kind: 'idle' }
  | { kind: 'debouncing' }
  | { kind: 'saving'; intent: SaveIntent }
  | { kind: 'pending-coalesced'; intent: SaveIntent; pending: SaveIntent }
  | { kind: 'reauth-pending'; intent: SaveIntent }
  | { kind: 'error'; intent: SaveIntent; error: SaveError }
  | { kind: 'halted' }
  | { kind: 'crashed' }
  | { kind: 'disposed' }
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
  dispatch(intent: DispatchIntent): Promise<SaveCompletion>;
  getState(): SaveEngineState;
  subscribe(listener: (state: SaveEngineState) => void): () => void;
  reauthSucceeded(): void;
  reauthAbandoned(): void;
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

interface Frozen {
  slot: Slot;
  error: SaveError;
}

function dropped(reason: DropReason): SaveCompletion {
  return { kind: 'dropped', reason };
}

function settle(waiters: Waiter[], completion: SaveCompletion): void {
  for (const waiter of waiters) {
    waiter(completion);
  }
}

function toSaveError(cause: unknown): SaveError {
  const message = cause instanceof Error ? cause.message : 'Save failed';
  return { kind: 'unknown', message, cause };
}

function sameState(a: SaveEngineState, b: SaveEngineState): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  const left = a as Partial<Record<'intent' | 'pending' | 'error', unknown>>;
  const right = b as Partial<Record<'intent' | 'pending' | 'error', unknown>>;
  return (
    left.intent === right.intent && left.pending === right.pending && left.error === right.error
  );
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
  // Set while re-authentication is pending: the failed slot freezes the queue until reauth resolves.
  let frozen: Frozen | null = null;
  let debounce: Timer | null = null;
  let timedCycle: Timer | null = null;
  let suppressedVersion: number | null = null;
  let leaveInProgress: Promise<LeaveDecision> | null = null;
  let disposed = false;

  function setState(next: SaveEngineState): void {
    if (sameState(state, next)) {
      return;
    }
    state = next;
    ports.onStateChange?.(state);
    for (const listener of [...listeners]) {
      listener(state);
    }
  }

  function isTerminal(): boolean {
    return state.kind === 'halted' || state.kind === 'crashed';
  }

  // Errors persist until a save actually starts; timers arming or dropping do not clear them.
  function deriveState(): SaveEngineState {
    if (frozen || isTerminal() || disposed) {
      return state;
    }
    if (inFlight) {
      return pending
        ? { kind: 'pending-coalesced', intent: inFlight.intent, pending: pending.intent }
        : { kind: 'saving', intent: inFlight.intent };
    }
    if (state.kind === 'error') {
      return state;
    }
    if (debounce || timedCycle) {
      return { kind: 'debouncing' };
    }
    return { kind: 'idle' };
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

  function restartDebounce(waiter?: Waiter): void {
    const waiters = debounce ? debounce.waiters : [];
    if (debounce) {
      cancel(debounce.handle);
    }
    if (waiter) {
      waiters.push(waiter);
    }
    const handle = schedule(() => {
      debounce = null;
      enqueue('autosave', waiters);
    }, AUTOSAVE_DEBOUNCE_MS);
    debounce = { handle, waiters };
    setState(deriveState());
  }

  function armTimedCycle(): void {
    if (timedCycle) {
      return;
    }
    const waiters: Waiter[] = [];
    const handle = schedule(() => {
      timedCycle = null;
      enqueue('timed', waiters);
    }, TIMED_SAVE_INTERVAL_MS);
    timedCycle = { handle, waiters };
    setState(deriveState());
  }

  // Higher priority wins and carries the loser's content; contradictory publish/revert is last-wins.
  function coalesce(intent: SaveIntent, waiters: Waiter[]): void {
    if (!pending) {
      pending = { intent, waiters };
      return;
    }
    const current = pending.intent;
    if (PRIORITY[intent] > PRIORITY[current]) {
      pending.intent = intent;
      pending.waiters.push(...waiters);
      return;
    }
    if (
      PRIORITY[intent] === PRIORITY[current] &&
      intent !== current &&
      isStatusChangingIntent(intent)
    ) {
      settle(pending.waiters, { kind: 'superseded', by: intent });
      pending = { intent, waiters };
      return;
    }
    pending.waiters.push(...waiters);
  }

  function enqueue(intent: SaveIntent, waiters: Waiter[]): void {
    if (inFlight || frozen) {
      coalesce(intent, waiters);
      setState(deriveState());
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

  function failSlot(slot: Slot, error: SaveError): void {
    settle(slot.waiters, { kind: 'failed', error });
    setState({ kind: 'error', intent: slot.intent, error });
    if (pending) {
      const next = pending;
      pending = null;
      void run(next);
    }
  }

  async function run(slot: Slot): Promise<void> {
    clearTimers(slot.waiters);

    let snapshot: S;
    try {
      snapshot = ports.getSnapshot();
    } catch (cause) {
      failSlot(slot, toSaveError(cause));
      return;
    }

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
      frozen = { slot, error };
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
    failSlot(slot, error);
  }

  function dispatch(intent: DispatchIntent): Promise<SaveCompletion> {
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

      let snapshot: S;
      try {
        snapshot = ports.getSnapshot();
      } catch (cause) {
        resolve({ kind: 'failed', error: toSaveError(cause) });
        return;
      }
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
      armTimedCycle();
      if (snapshot.isNew) {
        enqueue('autosave', [resolve]);
        return;
      }
      restartDebounce(resolve);
    });
  }

  function reauthSucceeded(): void {
    if (!frozen || disposed) {
      return;
    }
    const { slot } = frozen;
    frozen = null;
    if (isStatusChangingIntent(slot.intent)) {
      settle(slot.waiters, { kind: 'needs-retry' });
      resumeAutosave();
    } else {
      coalesce(slot.intent, slot.waiters);
    }
    drain();
  }

  // Riders folded into a publish/revert slot got needs-retry too; keep their content saving.
  function resumeAutosave(): void {
    const snapshot = readSnapshot();
    if (!snapshot || snapshot.status !== 'draft' || !snapshot.isDirty || isSuppressed(snapshot)) {
      return;
    }
    armTimedCycle();
    if (snapshot.isNew) {
      enqueue('autosave', []);
      return;
    }
    restartDebounce();
  }

  function readSnapshot(): S | null {
    try {
      return ports.getSnapshot();
    } catch {
      return null;
    }
  }

  function reauthAbandoned(): void {
    if (!frozen || disposed) {
      return;
    }
    const { slot, error } = frozen;
    frozen = null;
    const waiters = [...slot.waiters];
    clearTimers(waiters);
    if (pending) {
      waiters.push(...pending.waiters);
      pending = null;
    }
    settle(waiters, { kind: 'failed', error });
    setState({ kind: 'error', intent: slot.intent, error });
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

  function leaveRequested(): Promise<LeaveDecision> {
    if (!leaveInProgress) {
      leaveInProgress = decideLeave().finally(() => {
        leaveInProgress = null;
      });
    }
    return leaveInProgress;
  }

  // Fails closed: an unreadable snapshot asks for confirmation; a disposed engine lets the caller go.
  function dirtyDecision(): LeaveDecision {
    if (disposed) {
      return 'proceed';
    }
    const snapshot = readSnapshot();
    return !snapshot || snapshot.isDirty ? 'confirm' : 'proceed';
  }

  async function decideLeave(): Promise<LeaveDecision> {
    if (disposed) {
      return 'proceed';
    }
    let snapshot = readSnapshot();
    if (!snapshot) {
      return 'confirm';
    }
    if (isTerminal() || frozen) {
      return snapshot.isDirty ? 'confirm' : 'proceed';
    }

    let saveOnLeavePerformed = false;
    if (shouldSaveOnLeave(snapshot)) {
      await dispatch('leave');
      if (disposed) {
        return 'proceed';
      }
      saveOnLeavePerformed = true;
      snapshot = readSnapshot();
      if (!snapshot) {
        return 'confirm';
      }
    }

    if (!snapshot.isDirty) {
      return 'proceed';
    }
    if (frozen) {
      return 'confirm';
    }
    if (inFlight || pending) {
      await queueSettled();
      return dirtyDecision();
    }
    if (debounce || timedCycle) {
      if (saveOnLeavePerformed) {
        return 'confirm';
      }
      await dispatch('leave');
      return dirtyDecision();
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
    for (const slot of [inFlight, pending, frozen?.slot ?? null]) {
      if (slot) {
        waiters.push(...slot.waiters);
      }
    }
    inFlight = null;
    pending = null;
    frozen = null;
    settle(waiters, dropped('disposed'));
    setState({ kind: 'disposed' });
    listeners.clear();
  }

  return {
    dispatch,
    getState: () => state,
    subscribe,
    reauthSucceeded,
    reauthAbandoned,
    leaveRequested,
    dispose,
  };
}
