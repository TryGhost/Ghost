import type { PostStatus } from '@tryghost/admin-x-framework/api/posts';

export type { PostStatus };

export const AUTOSAVE_DEBOUNCE_MS = 3000;
export const TIMED_SAVE_INTERVAL_MS = 60000;
/** Title the API stores for a blank editor title. */
export const DEFAULT_TITLE = '(Untitled)';

export type SaveIntent =
  | 'autosave'
  | 'timed'
  | 'field'
  | 'explicit'
  | 'leave'
  | 'publish'
  | 'schedule'
  | 'revert';

/** `timed` is engine-internal: an autosave dispatch arms the 60s cycle. */
export type DispatchIntent = Exclude<SaveIntent, 'timed'>;

/** The only intents that may change a post's status. */
export type StatusIntent = 'publish' | 'schedule' | 'revert';

// Coalescing ladder: the higher number wins the pending slot.
const PRIORITY: Record<SaveIntent, number> = {
  autosave: 0,
  timed: 1,
  field: 2,
  leave: 3,
  explicit: 4,
  publish: 5,
  schedule: 5,
  revert: 5,
};

export function isBackgroundIntent(intent: SaveIntent): boolean {
  return intent === 'autosave' || intent === 'timed' || intent === 'field';
}

export function isStatusIntent(intent: SaveIntent): intent is StatusIntent {
  return intent === 'publish' || intent === 'schedule' || intent === 'revert';
}

export interface SaveTarget {
  status: PostStatus;
  /** ISO 8601 with zeroed milliseconds, or null */
  publishedAt: string | null;
  emailOnly?: boolean;
  newsletter?: string;
  emailSegment?: string;
}

export interface PublishOptions {
  /** Omitted keeps the post's current publish time; null clears it. */
  publishedAt?: string | null;
  emailOnly?: boolean;
  newsletter?: string;
  emailSegment?: string;
}

export interface ScheduleOptions extends PublishOptions {
  publishedAt: string;
}

/** Captured at dispatch and never re-derived from a later snapshot. */
export interface SaveCommand {
  readonly kind: SaveIntent;
  /** Present only for status intents; email extras ride on exactly this command's request. */
  readonly target?: Readonly<SaveTarget>;
  /** ORed across coalesced work: a rider that needs a revision makes the carrying save request one. */
  readonly requiresRevision: boolean;
  /** The target changed the status when captured; re-auth falls back to this when the snapshot is unreadable. */
  readonly requiresReconfirmation: boolean;
}

/** A persisted post always carries the server's updated_at; every update sends it for the collision check. */
export type PersistedIdentity = { id: string; updatedAt: string } | { id: null; updatedAt: null };

export type SaveSnapshot = PersistedIdentity & {
  status: PostStatus;
  /** ISO 8601 or null */
  publishedAt: string | null;
  title: string;
  /** Empty until generated */
  slug: string;
  /** Title differs from the last saved title; a draft's derived slug regenerates on save. */
  titleDirty: boolean;
  /** The slug machine's custom mode: the slug never follows the title again. */
  slugIsCustom: boolean;
  isDirty: boolean;
  changedSinceLastRevision: boolean;
  /** Monotonic local edit counter; validation/host-limit suppression lifts once it moves. */
  version: number;
};

/** Handed unchanged from prepare through reconcile; the engine never mutates it. */
export interface SaveRequest<S extends SaveSnapshot = SaveSnapshot> {
  readonly command: SaveCommand;
  /** The complete post as read at execution time, after pending slug work settled. */
  readonly snapshot: S;
  /** `(Untitled)` substituted for a blank title */
  readonly title: string;
  /** Generated when missing or when a draft's derived slug is stale */
  readonly slug: string;
  readonly target: SaveTarget;
  readonly saveRevision: boolean;
}

/** The acknowledged identity; a create exposes the id the tracker adopts. */
export interface SaveResult {
  id: string;
  status: PostStatus;
  updatedAt: string;
}

export type SaveErrorKind =
  | 'session-invalid'
  | 'not-found'
  | 'conflict'
  | 'host-limit'
  | 'transport'
  | 'validation'
  | 'unknown';

export interface SaveError {
  kind: SaveErrorKind;
  message: string;
  cause?: unknown;
}

export type SaveOutcome<R extends SaveResult = SaveResult> =
  | { ok: true; result: R }
  | { ok: false; error: SaveError };

export type DropReason = 'not-draft' | 'clean' | 'suppressed' | 'conflict' | 'halted' | 'disposed';

export type SaveCompletion =
  | { kind: 'saved'; result: SaveResult; executedAs: SaveIntent }
  | { kind: 'failed'; error: SaveError; executedAs: SaveIntent }
  | { kind: 'dropped'; reason: DropReason }
  /** A later status command replaced this one before it ran; riders stayed with the winner. */
  | { kind: 'superseded'; by: SaveIntent }
  /** The command would change the status and re-auth interrupted it; the publish flow must re-confirm. */
  | { kind: 'needs-retry' };

export type SaveEngineState =
  | { kind: 'idle' }
  | { kind: 'debouncing' }
  | { kind: 'saving'; intent: SaveIntent }
  | { kind: 'pending-coalesced'; intent: SaveIntent; pending: SaveIntent }
  | { kind: 'reauth-pending'; intent: SaveIntent }
  | { kind: 'error'; intent: SaveIntent; error: SaveError }
  /** The server rejected a stale updated_at; automatic saves halt until the baseline changes. */
  | { kind: 'conflict'; intent: SaveIntent; error: SaveError }
  | { kind: 'halted' }
  | { kind: 'crashed' }
  | { kind: 'disposed' };

export type LeaveDecision = 'proceed' | 'confirm';

export interface SlugPort {
  /** Resolves once any manual slug edit in progress has settled. */
  settled: () => Promise<void>;
  /** Server-deduplicated slug for a title; `postId` excludes the post itself. */
  fromTitle: (title: string, postId: string | null, signal: AbortSignal) => Promise<string>;
}

/** `P` is a plain structural superset of the request (no brand); `R` of the acknowledged result. */
export interface SaveEnginePorts<
  S extends SaveSnapshot = SaveSnapshot,
  P extends SaveRequest<S> = SaveRequest<S>,
  R extends SaveResult = SaveResult,
> {
  getSnapshot: () => S;
  slug: SlugPort;
  /** Builds and validates the candidate; runs inside the single-flight unit, before any IO. */
  prepare: (request: SaveRequest<S>, signal: AbortSignal) => Promise<P>;
  /** IO only. A rejected promise is treated as an `unknown` error. */
  execute: (prepared: P, signal: AbortSignal) => Promise<SaveOutcome<R>>;
  /**
   * Awaited before the pending slot drains. Adopt the id, the authoritative status
   * and updated_at; preserve edits made after `prepared.snapshot.version`; resync
   * server-normalized values only where the local value did not change in flight;
   * advance the saved/revision baselines without marking newer edits clean.
   */
  reconcile: (prepared: P, result: R) => Promise<void> | void;
  setTimeout?: (fn: () => void, ms: number) => unknown;
  clearTimeout?: (handle: unknown) => void;
  onStateChange?: (state: SaveEngineState) => void;
  /** A throwing subscriber is reported here instead of interrupting the others. */
  onListenerError?: (error: unknown) => void;
}

export interface SaveEngine {
  dispatch(kind: 'schedule', options: ScheduleOptions): Promise<SaveCompletion>;
  dispatch(kind: 'publish', options?: PublishOptions): Promise<SaveCompletion>;
  dispatch(kind: Exclude<DispatchIntent, 'publish' | 'schedule'>): Promise<SaveCompletion>;
  getState(): SaveEngineState;
  subscribe(listener: (state: SaveEngineState) => void): () => void;
  reauthSucceeded(): void;
  reauthAbandoned(): void;
  leaveRequested(): Promise<LeaveDecision>;
  /** Also aborts the in-flight signal; a response arriving afterwards is never reconciled. */
  dispose(): void;
}

export type TargetSource = Pick<SaveSnapshot, 'status' | 'publishedAt'>;

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

function withEmail(target: SaveTarget, options: PublishOptions): SaveTarget {
  if (options.emailOnly !== undefined) {
    target.emailOnly = options.emailOnly;
  }
  if (options.newsletter !== undefined) {
    target.newsletter = options.newsletter;
  }
  if (options.emailSegment !== undefined) {
    target.emailSegment = options.emailSegment;
  }
  return target;
}

/** Transition-derived target for a status intent, from the source the command was captured against. */
export function deriveTarget(
  kind: StatusIntent,
  source: TargetSource,
  options: PublishOptions = {},
): SaveTarget {
  switch (kind) {
    case 'publish':
      return withEmail(
        {
          status: 'published',
          publishedAt: zeroMilliseconds(
            options.publishedAt === undefined ? source.publishedAt : options.publishedAt,
          ),
        },
        options,
      );
    case 'schedule':
      return withEmail(
        { status: 'scheduled', publishedAt: zeroMilliseconds(options.publishedAt ?? null) },
        options,
      );
    case 'revert':
      // Unscheduling clears the publish time; unpublishing keeps it as history.
      return {
        status: 'draft',
        publishedAt: source.status === 'scheduled' ? null : zeroMilliseconds(source.publishedAt),
        emailOnly: false,
      };
  }
}

/** Background intents pin draft; explicit and leave preserve the status; status intents carry their own target. */
export function resolveTarget(command: SaveCommand, snapshot: TargetSource): SaveTarget {
  if (command.target) {
    return command.target;
  }
  return {
    status: isBackgroundIntent(command.kind) ? 'draft' : snapshot.status,
    publishedAt: zeroMilliseconds(snapshot.publishedAt),
  };
}

function changesStatus(command: SaveCommand, snapshot: TargetSource): boolean {
  return resolveTarget(command, snapshot).status !== snapshot.status;
}

interface Waiter {
  command: SaveCommand;
  resolve: (completion: SaveCompletion) => void;
}

interface Slot {
  command: SaveCommand;
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

const AUTOSAVE: SaveCommand = {
  kind: 'autosave',
  requiresRevision: false,
  requiresReconfirmation: false,
};
const TIMED: SaveCommand = {
  kind: 'timed',
  requiresRevision: false,
  requiresReconfirmation: false,
};

function dropped(reason: DropReason): SaveCompletion {
  return { kind: 'dropped', reason };
}

function failed(error: SaveError, executedAs: SaveIntent): SaveCompletion {
  return { kind: 'failed', error, executedAs };
}

function settle(waiters: Waiter[], completion: SaveCompletion): void {
  for (const waiter of waiters) {
    waiter.resolve(completion);
  }
}

function withRevision(command: SaveCommand, waiters: Waiter[]): SaveCommand {
  const requiresRevision =
    command.requiresRevision || waiters.some((waiter) => waiter.command.requiresRevision);
  return requiresRevision === command.requiresRevision ? command : { ...command, requiresRevision };
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

function rethrowAsync(error: unknown): void {
  queueMicrotask(() => {
    throw error;
  });
}

export function createSaveEngine<
  S extends SaveSnapshot = SaveSnapshot,
  P extends SaveRequest<S> = SaveRequest<S>,
  R extends SaveResult = SaveResult,
>(ports: SaveEnginePorts<S, P, R>): SaveEngine {
  const schedule = ports.setTimeout ?? ((fn, ms) => globalThis.setTimeout(fn, ms));
  const cancel = ports.clearTimeout ?? ((handle) => globalThis.clearTimeout(handle as number));
  const reportListenerError = ports.onListenerError ?? rethrowAsync;
  const listeners = new Set<(state: SaveEngineState) => void>();
  const transitionWatchers = new Set<() => void>();

  let state: SaveEngineState = { kind: 'idle' };
  let inFlight: Slot | null = null;
  let inFlightAbort: AbortController | null = null;
  let pending: Slot | null = null;
  // Set while re-authentication is pending: the failed slot freezes the queue until reauth resolves.
  let frozen: Frozen | null = null;
  let debounce: Timer | null = null;
  let timedCycle: Timer | null = null;
  let suppressedVersion: number | null = null;
  // updated_at the server rejected; automatic saves stay halted while the snapshot still carries it.
  let staleUpdatedAt: string | null = null;
  let leaveInProgress: Promise<LeaveDecision> | null = null;
  let disposed = false;

  function setState(next: SaveEngineState): void {
    if (sameState(state, next)) {
      return;
    }
    state = next;
    ports.onStateChange?.(next);
    for (const listener of [...listeners]) {
      // A nested transition already notified everyone with the newer state.
      if (state !== next) {
        break;
      }
      try {
        listener(next);
      } catch (error) {
        reportListenerError(error);
      }
    }
    for (const watcher of [...transitionWatchers]) {
      watcher();
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
        ? {
            kind: 'pending-coalesced',
            intent: inFlight.command.kind,
            pending: pending.command.kind,
          }
        : { kind: 'saving', intent: inFlight.command.kind };
    }
    if (state.kind === 'error' || state.kind === 'conflict') {
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

  function isStale(snapshot: S): boolean {
    return staleUpdatedAt !== null && snapshot.updatedAt === staleUpdatedAt;
  }

  // Sidebar edits on published/scheduled/sent posts stage until Update (spec §4); never promote them to saves.
  function backgroundDropReason(snapshot: S): DropReason | null {
    if (snapshot.status !== 'draft') {
      return 'not-draft';
    }
    if (isSuppressed(snapshot)) {
      return 'suppressed';
    }
    if (isStale(snapshot)) {
      return 'conflict';
    }
    return null;
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
      enqueue(AUTOSAVE, waiters);
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
      enqueue(TIMED, waiters);
    }, TIMED_SAVE_INTERVAL_MS);
    timedCycle = { handle, waiters };
    setState(deriveState());
  }

  // Higher priority wins and carries the riders; a later status command supersedes only the earlier one.
  function coalesce(command: SaveCommand, waiters: Waiter[]): void {
    if (!pending) {
      pending = { command: withRevision(command, waiters), waiters };
      return;
    }
    let winner = pending.command;
    if (isStatusIntent(command.kind) && isStatusIntent(pending.command.kind)) {
      const superseded = pending.waiters.filter((waiter) => isStatusIntent(waiter.command.kind));
      pending.waiters = pending.waiters.filter((waiter) => !isStatusIntent(waiter.command.kind));
      settle(superseded, { kind: 'superseded', by: command.kind });
      winner = command;
    } else if (PRIORITY[command.kind] > PRIORITY[pending.command.kind]) {
      winner = command;
    }
    pending.waiters.push(...waiters);
    pending.command = withRevision(winner, pending.waiters);
  }

  function enqueue(command: SaveCommand, waiters: Waiter[]): void {
    if (inFlight || frozen) {
      coalesce(command, waiters);
      setState(deriveState());
      return;
    }
    void run({ command, waiters });
  }

  function drain(): void {
    if (inFlight) {
      return;
    }
    const next = pending;
    pending = null;
    if (next) {
      void run(next);
    } else {
      setState(deriveState());
    }
  }

  function failSlot(slot: Slot, error: SaveError): void {
    settle(slot.waiters, failed(error, slot.command.kind));
    setState({ kind: 'error', intent: slot.command.kind, error });
    drain();
  }

  function needsSlug(snapshot: S, title: string): boolean {
    if (!snapshot.slug) {
      return true;
    }
    return (
      snapshot.status === 'draft' &&
      snapshot.titleDirty &&
      !snapshot.slugIsCustom &&
      title !== DEFAULT_TITLE
    );
  }

  async function buildRequest(
    command: SaveCommand,
    snapshot: S,
    signal: AbortSignal,
  ): Promise<SaveRequest<S>> {
    const title = snapshot.title.trim() ? snapshot.title : DEFAULT_TITLE;
    let slug = snapshot.slug;
    if (needsSlug(snapshot, title)) {
      slug = (await ports.slug.fromTitle(title, snapshot.id, signal)) || slug;
    }
    return {
      command,
      snapshot,
      title,
      slug,
      target: resolveTarget(command, snapshot),
      saveRevision: command.requiresRevision,
    };
  }

  function dropReason(slot: Slot, snapshot: S): DropReason | null {
    if (!isBackgroundIntent(slot.command.kind)) {
      return null;
    }
    if (snapshot.status !== 'draft') {
      return 'not-draft';
    }
    if (!snapshot.isDirty) {
      return 'clean';
    }
    return backgroundDropReason(snapshot);
  }

  async function run(slot: Slot): Promise<void> {
    clearTimers(slot.waiters);
    slot.command = withRevision(slot.command, slot.waiters);

    let snapshot: S;
    try {
      snapshot = ports.getSnapshot();
    } catch (cause) {
      failSlot(slot, toSaveError(cause));
      return;
    }
    const early = dropReason(slot, snapshot);
    if (early) {
      settle(slot.waiters, dropped(early));
      drain();
      return;
    }

    inFlight = slot;
    const abort = new AbortController();
    inFlightAbort = abort;
    setState(deriveState());

    let outcome: SaveOutcome<R>;
    try {
      await ports.slug.settled();
      if (disposed) {
        return;
      }
      // Manual slug work may have taken time; the payload reflects the post as it is now.
      snapshot = ports.getSnapshot();
      const late = dropReason(slot, snapshot);
      if (late) {
        inFlight = null;
        inFlightAbort = null;
        settle(slot.waiters, dropped(late));
        drain();
        return;
      }
      const prepared = await ports.prepare(
        await buildRequest(slot.command, snapshot, abort.signal),
        abort.signal,
      );
      if (disposed) {
        return;
      }
      outcome = await ports.execute(prepared, abort.signal);
      if (disposed) {
        return;
      }
      if (outcome.ok) {
        await ports.reconcile(prepared, outcome.result);
      }
    } catch (cause) {
      outcome = { ok: false, error: toSaveError(cause) };
    }

    if (disposed) {
      return;
    }
    inFlight = null;
    inFlightAbort = null;

    if (outcome.ok) {
      suppressedVersion = null;
      staleUpdatedAt = null;
      settle(slot.waiters, {
        kind: 'saved',
        result: outcome.result,
        executedAs: slot.command.kind,
      });
      drain();
      return;
    }
    handleError(slot, snapshot, outcome.error);
  }

  function handleError(slot: Slot, snapshot: S, error: SaveError): void {
    const intent = slot.command.kind;

    if (error.kind === 'session-invalid') {
      frozen = { slot, error };
      setState({ kind: 'reauth-pending', intent });
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
      settle(slot.waiters, failed(error, intent));
      setState({ kind: snapshot.id ? 'halted' : 'crashed' });
      return;
    }

    if (error.kind === 'conflict') {
      staleUpdatedAt = snapshot.updatedAt;
      const dropWaiters: Waiter[] = [];
      clearTimers(dropWaiters);
      settle(dropWaiters, dropped('conflict'));
      settle(slot.waiters, failed(error, intent));
      setState({ kind: 'conflict', intent, error });
      drain();
      return;
    }

    if (error.kind === 'validation') {
      suppressedVersion = snapshot.version;
    }
    // A limit hit by a status change says nothing about draft persistence; only a draft save's limit halts it.
    if (error.kind === 'host-limit' && !changesStatus(slot.command, snapshot)) {
      suppressedVersion = snapshot.version;
    }
    failSlot(slot, error);
  }

  function captureCommand(kind: DispatchIntent, snapshot: S | null, options?: PublishOptions) {
    if (isStatusIntent(kind) && snapshot) {
      const target = deriveTarget(kind, snapshot, options);
      return {
        kind,
        target,
        requiresRevision: false,
        requiresReconfirmation: target.status !== snapshot.status,
      } satisfies SaveCommand;
    }
    return {
      kind,
      requiresRevision: kind === 'explicit' || kind === 'leave',
      requiresReconfirmation: false,
    } satisfies SaveCommand;
  }

  function dispatch(kind: DispatchIntent, options?: PublishOptions): Promise<SaveCompletion> {
    return new Promise<SaveCompletion>((resolve) => {
      if (disposed) {
        resolve(dropped('disposed'));
        return;
      }
      if (isTerminal()) {
        resolve(dropped('halted'));
        return;
      }

      let snapshot: S | null = null;
      if (isBackgroundIntent(kind) || isStatusIntent(kind)) {
        try {
          snapshot = ports.getSnapshot();
        } catch (cause) {
          resolve(failed(toSaveError(cause), kind));
          return;
        }
      }
      const waiter: Waiter = { command: captureCommand(kind, snapshot, options), resolve };

      if (!isBackgroundIntent(kind) || !snapshot) {
        const waiters = [waiter];
        clearTimers(waiters);
        enqueue(waiter.command, waiters);
        return;
      }

      const reason = backgroundDropReason(snapshot);
      if (reason) {
        resolve(dropped(reason));
        return;
      }
      if (kind === 'field') {
        enqueue(waiter.command, [waiter]);
        return;
      }
      armTimedCycle();
      if (snapshot.id === null) {
        enqueue(waiter.command, [waiter]);
        return;
      }
      restartDebounce(waiter);
    });
  }

  function readSnapshot(): S | null {
    try {
      return ports.getSnapshot();
    } catch {
      return null;
    }
  }

  // Judged by the resolved effect against the current post, not by the intent label.
  function needsReconfirmation(command: SaveCommand, snapshot: S | null): boolean {
    return snapshot ? changesStatus(command, snapshot) : command.requiresReconfirmation;
  }

  function reauthSucceeded(): void {
    if (!frozen || disposed) {
      return;
    }
    const slots = pending ? [frozen.slot, pending] : [frozen.slot];
    frozen = null;
    pending = null;
    const snapshot = readSnapshot();
    let reconfirm = false;
    for (const slot of slots) {
      for (const waiter of slot.waiters) {
        if (needsReconfirmation(waiter.command, snapshot)) {
          waiter.resolve({ kind: 'needs-retry' });
          reconfirm = true;
        } else {
          coalesce(waiter.command, [waiter]);
        }
      }
    }
    // Content a disarmed status command would have carried resumes through the normal autosave path.
    if (reconfirm && !pending) {
      resumeAutosave(snapshot);
    }
    drain();
  }

  function resumeAutosave(snapshot: S | null): void {
    if (!snapshot) {
      // The re-armed autosave re-reads the snapshot and surfaces a failure instead of abandoning content.
      armTimedCycle();
      restartDebounce();
      return;
    }
    if (snapshot.status !== 'draft' || !snapshot.isDirty || backgroundDropReason(snapshot)) {
      return;
    }
    armTimedCycle();
    if (snapshot.id === null) {
      enqueue(AUTOSAVE, []);
      return;
    }
    restartDebounce();
  }

  function reauthAbandoned(): void {
    if (!frozen || disposed) {
      return;
    }
    const { slot, error } = frozen;
    frozen = null;
    settle(slot.waiters, failed(error, slot.command.kind));
    const waiters: Waiter[] = [];
    clearTimers(waiters);
    if (pending) {
      waiters.push(...pending.waiters);
      pending = null;
    }
    for (const waiter of waiters) {
      waiter.resolve(failed(error, waiter.command.kind));
    }
    setState({ kind: 'error', intent: slot.command.kind, error });
  }

  function queueSettled(): Promise<void> {
    return new Promise<void>((resolve) => {
      const check = () => {
        if ((!inFlight && !pending) || frozen || disposed || isTerminal()) {
          transitionWatchers.delete(check);
          resolve();
        }
      };
      transitionWatchers.add(check);
      check();
    });
  }

  function leaveRequested(): Promise<LeaveDecision> {
    if (!leaveInProgress) {
      leaveInProgress = decideLeave().finally(() => {
        leaveInProgress = null;
      });
    }
    return leaveInProgress;
  }

  // Loops until nothing is in flight, pending, or armed, re-reading the post after every wait.
  // Fails closed: an unreadable snapshot asks for confirmation; a disposed engine lets the caller go.
  async function decideLeave(): Promise<LeaveDecision> {
    let saveOnLeavePerformed = false;
    for (;;) {
      if (disposed) {
        return 'proceed';
      }
      const snapshot = readSnapshot();
      if (!snapshot) {
        return 'confirm';
      }
      if (isTerminal() || frozen) {
        return snapshot.isDirty ? 'confirm' : 'proceed';
      }
      const canSaveOnLeave =
        !saveOnLeavePerformed &&
        snapshot.isDirty &&
        snapshot.status === 'draft' &&
        !isStale(snapshot);
      if (canSaveOnLeave && snapshot.changedSinceLastRevision) {
        saveOnLeavePerformed = true;
        await dispatch('leave');
        continue;
      }
      if (inFlight || pending) {
        await queueSettled();
        continue;
      }
      if (!snapshot.isDirty) {
        return 'proceed';
      }
      if (canSaveOnLeave && (debounce || timedCycle)) {
        saveOnLeavePerformed = true;
        await dispatch('leave');
        continue;
      }
      return 'confirm';
    }
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
    inFlightAbort?.abort();
    inFlightAbort = null;
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
