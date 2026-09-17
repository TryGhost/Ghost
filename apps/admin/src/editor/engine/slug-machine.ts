// Posts do not persist slug provenance, so ownership is inferred structurally at load.
// The full behavior contract is in README.md.
import { slugify } from '@tryghost/string';
import { DEFAULT_TITLE } from './save-engine';

export const DUPLICATED_POST_TITLE_SUFFIX = '(Copy)';

export type SlugMode = 'derived' | 'custom';

export interface SlugMachineState {
  readonly mode: SlugMode;
  readonly slug: string;
  /** The title the slug was loaded with or last generated from; drives the same-title check. */
  readonly title: string;
  /** True while a title or manual request that can still apply is in flight. */
  readonly pending: boolean;
}

export type UnchangedReason =
  | 'same-title'
  | 'custom'
  | 'frozen'
  | 'stale'
  | 'empty-result'
  | 'reverted'
  | 'error';

export type SlugProposal =
  | { readonly slug: string; readonly source: 'generated' }
  | { readonly slug: string; readonly source: 'manual' }
  | {
      readonly slug: string;
      readonly source: 'unchanged';
      readonly reason: UnchangedReason;
      readonly error?: unknown;
    };

export interface LoadedPost {
  readonly slug: string;
  readonly title: string;
}

export interface SlugMachineOptions {
  /** Port for GET /slugs/post/:name/:id — receives the raw text, returns the deduplicated slug. */
  generateSlug: (text: string) => Promise<string>;
  /** Listener failures are isolated from machine transitions and reported here. Must not throw. */
  onListenerError: (error: unknown) => void;
}

/** Called on every state change; acknowledgements, pending changes and loads have no proposal. */
export type SlugListener = (state: SlugMachineState, proposal: SlugProposal | null) => void;

export interface SlugMachine {
  loaded(post: LoadedPost): void;
  /** Adopts server-normalized values only while the submitted source still owns the state. */
  saveAcknowledged(submitted: LoadedPost, acknowledged: LoadedPost): void;
  titleCommitted(title: string): Promise<SlugProposal>;
  slugEdited(input: string): Promise<SlugProposal>;
  getState(): SlugMachineState;
  subscribe(listener: SlugListener): () => void;
}

// A slug that differs from slugify(saved title) is custom unless the saved title is
// (Untitled) or ends with (Copy), whose next meaningful title should regenerate it.
export function isCustomSlug(slug: string, title: string): boolean {
  if (!slug) {
    return false;
  }
  if (title === DEFAULT_TITLE || title.endsWith(DUPLICATED_POST_TITLE_SUFFIX)) {
    return false;
  }
  return slugify(title) !== slug;
}

export function shouldGenerateSlug(
  state: Pick<SlugMachineState, 'mode' | 'slug'>,
  title: string,
): boolean {
  if (state.mode === 'custom') {
    return false;
  }
  const trimmed = title.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed === DEFAULT_TITLE && state.slug) {
    return false;
  }
  return true;
}

// Returns null when the input must revert to the current slug (blank or unchanged).
export function normalizeManualSlug(input: string, currentSlug: string): string | null {
  const candidate = (input || currentSlug).trim();
  if (!candidate || candidate === currentSlug) {
    return null;
  }
  return candidate;
}

// Keep the current slug when the server only appended an incrementor to it and the user did not
// type that exact value.
export function resolveDedupedSlug(
  serverSlug: string,
  candidate: string,
  currentSlug: string,
): string {
  if (serverSlug === currentSlug) {
    return currentSlug;
  }
  const tokens = serverSlug.split('-');
  const increment = Number(tokens.pop());
  if (increment > 0 && tokens.join('-') === currentSlug && serverSlug !== slugify(candidate)) {
    return currentSlug;
  }
  return serverSlug;
}

export type Submission =
  | { readonly kind: 'title'; readonly value: string }
  | { readonly kind: 'manual'; readonly value: string };

/** A submission's ticket identifies its caller's promise and the request it may issue. */
export interface SlugRequest {
  readonly ticket: number;
  readonly kind: Submission['kind'];
  readonly text: string;
  readonly slugAtRequest: string;
}

export interface DeferredSubmission {
  readonly ticket: number;
  readonly submission: Submission;
  readonly slugAtSubmission: string;
}

interface Core {
  /** Settled ownership: only a load or an applied manual edit moves it. */
  readonly mode: SlugMode;
  readonly slug: string;
  readonly title: string;
}

export type SlugState =
  | (Core & { readonly kind: 'idle' })
  | (Core & {
      readonly kind: 'generating';
      readonly request: SlugRequest;
      readonly deferred: DeferredSubmission | null;
    });

export type SlugEvent =
  | { readonly type: 'loaded'; readonly slug: string; readonly title: string }
  | {
      readonly type: 'acknowledged';
      readonly submitted: LoadedPost;
      readonly acknowledged: LoadedPost;
    }
  | { readonly type: 'submitted'; readonly ticket: number; readonly submission: Submission }
  | {
      readonly type: 'settled';
      readonly ticket: number;
      readonly outcome: { readonly ok: string } | { readonly error: unknown };
    };

export type SlugEffect =
  | { readonly type: 'request'; readonly ticket: number; readonly text: string }
  | { readonly type: 'resolve'; readonly ticket: number; readonly proposal: SlugProposal }
  | { readonly type: 'notify'; readonly proposal: SlugProposal | null }
  /** Re-enters the reducer with a deferred submission after the effects before it ran. */
  | { readonly type: 'resubmit'; readonly ticket: number; readonly submission: Submission };

export interface SlugTransition {
  readonly state: SlugState;
  readonly effects: readonly SlugEffect[];
}

export const INITIAL_SLUG_STATE: SlugState = { kind: 'idle', mode: 'derived', slug: '', title: '' };

// A manual request on the wire reads as custom until it settles.
export function viewOf(state: SlugState): SlugMachineState {
  const generating = state.kind === 'generating';
  return {
    mode: generating && state.request.kind === 'manual' ? 'custom' : state.mode,
    slug: state.slug,
    title: state.title,
    pending: generating,
  };
}

const unchanged = (slug: string, reason: UnchangedReason, error?: unknown): SlugProposal => ({
  slug,
  source: 'unchanged',
  reason,
  ...(error !== undefined && { error }),
});

const resolve = (ticket: number, proposal: SlugProposal): SlugEffect => ({
  type: 'resolve',
  ticket,
  proposal,
});

const notify = (proposal: SlugProposal | null): SlugEffect => ({ type: 'notify', proposal });

const staleDeferred = (deferred: DeferredSubmission): SlugEffect =>
  resolve(deferred.ticket, unchanged(deferred.slugAtSubmission, 'stale'));

const staleRequest = (request: SlugRequest): SlugEffect =>
  resolve(request.ticket, unchanged(request.slugAtRequest, 'stale'));

const isSameTitle = (core: Core, title: string): boolean => title === core.title && !!core.slug;

const isFrozen = (core: Core, title: string): boolean =>
  !shouldGenerateSlug({ mode: 'derived', slug: core.slug }, title);

// Every refusal emits the current slug so a manual input can reset to it.
function refuse(state: SlugState, ticket: number, reason: UnchangedReason): SlugTransition {
  const proposal = unchanged(state.slug, reason);
  return { state, effects: [resolve(ticket, proposal), notify(proposal)] };
}

function start(core: Core, request: Omit<SlugRequest, 'slugAtRequest'>): SlugTransition {
  return {
    state: {
      ...core,
      kind: 'generating',
      request: { ...request, slugAtRequest: core.slug },
      deferred: null,
    },
    effects: [{ type: 'request', ticket: request.ticket, text: request.text }, notify(null)],
  };
}

function submitIdle(state: SlugState, ticket: number, submission: Submission): SlugTransition {
  const core: Core = { mode: state.mode, slug: state.slug, title: state.title };
  if (submission.kind === 'title') {
    const title = submission.value.trim();
    if (core.mode === 'custom') {
      return refuse(state, ticket, 'custom');
    }
    if (isSameTitle(core, title)) {
      return refuse(state, ticket, 'same-title');
    }
    if (isFrozen(core, title)) {
      return refuse(state, ticket, 'frozen');
    }
    return start(core, { ticket, kind: 'title', text: title });
  }
  const candidate = normalizeManualSlug(submission.value, core.slug);
  if (candidate === null) {
    return refuse(state, ticket, 'reverted');
  }
  return start(core, { ticket, kind: 'manual', text: candidate });
}

// At most one request is on the wire. A submission behind it waits in the single deferred slot;
// the submission it replaces resolves stale without reaching the server.
function defer(
  state: Extract<SlugState, { kind: 'generating' }>,
  ticket: number,
  submission: Submission,
): SlugTransition {
  return {
    state: { ...state, deferred: { ticket, submission, slugAtSubmission: state.slug } },
    effects: state.deferred ? [staleDeferred(state.deferred)] : [],
  };
}

const resubmit = (deferred: DeferredSubmission): SlugEffect => ({
  type: 'resubmit',
  ticket: deferred.ticket,
  submission: deferred.submission,
});

// Dropping the request frees the wire: its late answer no longer matches a held ticket. The
// deferred submission either resolves stale with it or runs at once against the idle state.
function withdraw(
  state: Extract<SlugState, { kind: 'generating' }>,
  ticket: number,
  reason: UnchangedReason,
  keepDeferred: boolean,
): SlugTransition {
  const { request, deferred } = state;
  const proposal = unchanged(state.slug, reason);
  const kept = keepDeferred ? deferred : null;
  return {
    state: { kind: 'idle', mode: state.mode, slug: state.slug, title: state.title },
    effects: [
      ...(deferred && !kept ? [staleDeferred(deferred)] : []),
      staleRequest(request),
      resolve(ticket, proposal),
      notify(proposal),
      ...(kept ? [resubmit(kept)] : []),
    ],
  };
}

function submitGenerating(
  state: Extract<SlugState, { kind: 'generating' }>,
  ticket: number,
  submission: Submission,
): SlugTransition {
  const { request, deferred } = state;
  if (submission.kind === 'manual') {
    if (normalizeManualSlug(submission.value, state.slug) !== null) {
      return defer(state, ticket, submission);
    }
    // A no-op blur withdraws manual work only: a deferred manual edit, and a manual request on
    // the wire. Title generation keeps running.
    if (request.kind === 'manual') {
      return withdraw(state, ticket, 'reverted', deferred?.submission.kind === 'title');
    }
    const proposal = unchanged(state.slug, 'reverted');
    const dropped = deferred?.submission.kind === 'manual' ? deferred : null;
    return {
      state: dropped ? { ...state, deferred: null } : state,
      effects: [
        ...(dropped ? [staleDeferred(dropped)] : []),
        resolve(ticket, proposal),
        notify(proposal),
      ],
    };
  }
  // A title behind a manual request waits for its outcome: applied means custom, failed means
  // generate. A title that would not generate withdraws title generation on the wire at once.
  if (request.kind === 'manual') {
    return defer(state, ticket, submission);
  }
  const title = submission.value.trim();
  if (isSameTitle(state, title)) {
    return withdraw(state, ticket, 'same-title', false);
  }
  if (isFrozen(state, title)) {
    return withdraw(state, ticket, 'frozen', false);
  }
  return defer(state, ticket, submission);
}

function settle(
  state: Extract<SlugState, { kind: 'generating' }>,
  outcome: Extract<SlugEvent, { type: 'settled' }>['outcome'],
): SlugTransition {
  const { request, deferred } = state;
  const core: Core = { mode: state.mode, slug: state.slug, title: state.title };
  const finish = (next: Core, proposal: SlugProposal): SlugTransition => ({
    state: { ...next, kind: 'idle' },
    effects: [
      resolve(request.ticket, proposal),
      notify(proposal),
      ...(deferred ? [resubmit(deferred)] : []),
    ],
  });
  if ('error' in outcome) {
    return finish(core, unchanged(core.slug, 'error', outcome.error));
  }
  if (!outcome.ok.trim()) {
    return finish(core, unchanged(core.slug, 'empty-result'));
  }
  if (request.kind === 'title') {
    return finish(
      { ...core, slug: outcome.ok, title: request.text },
      { slug: outcome.ok, source: 'generated' },
    );
  }
  const resolved = resolveDedupedSlug(outcome.ok, request.text, core.slug);
  if (resolved === core.slug) {
    return finish(core, unchanged(core.slug, 'reverted'));
  }
  return finish({ ...core, slug: resolved, mode: 'custom' }, { slug: resolved, source: 'manual' });
}

export function reduceSlug(state: SlugState, event: SlugEvent): SlugTransition {
  switch (event.type) {
    case 'loaded': {
      // A document boundary: everything from the previous post resolves stale.
      const effects: SlugEffect[] = [];
      if (state.kind === 'generating') {
        if (state.deferred) {
          effects.push(staleDeferred(state.deferred));
        }
        effects.push(staleRequest(state.request));
      }
      return {
        state: {
          kind: 'idle',
          mode: isCustomSlug(event.slug, event.title) ? 'custom' : 'derived',
          slug: event.slug,
          title: event.title,
        },
        effects: [...effects, notify(null)],
      };
    }
    case 'acknowledged': {
      const { submitted, acknowledged } = event;
      const slug = state.slug === submitted.slug ? acknowledged.slug : state.slug;
      const title = state.title === submitted.title ? acknowledged.title : state.title;
      if (slug === state.slug && title === state.title) {
        return { state, effects: [] };
      }
      return { state: { ...state, slug, title }, effects: [notify(null)] };
    }
    case 'submitted':
      return state.kind === 'idle'
        ? submitIdle(state, event.ticket, event.submission)
        : submitGenerating(state, event.ticket, event.submission);
    case 'settled':
      if (state.kind !== 'generating' || state.request.ticket !== event.ticket) {
        return { state, effects: [] };
      }
      return settle(state, event.outcome);
  }
}

export function createSlugMachine({
  generateSlug,
  onListenerError,
}: SlugMachineOptions): SlugMachine {
  let state: SlugState = INITIAL_SLUG_STATE;
  let nextTicket = 0;
  const waiters = new Map<number, (proposal: SlugProposal) => void>();
  const listeners = new Set<SlugListener>();
  const queue: SlugEffect[] = [];
  let running = false;

  const run = (effect: SlugEffect): void => {
    switch (effect.type) {
      case 'request': {
        // The executor turns a synchronous throw from the port into a rejection.
        void new Promise<string>((resolveAnswer) => {
          resolveAnswer(generateSlug(effect.text));
        }).then(
          (ok) => dispatch({ type: 'settled', ticket: effect.ticket, outcome: { ok } }),
          (error: unknown) =>
            dispatch({ type: 'settled', ticket: effect.ticket, outcome: { error } }),
        );
        return;
      }
      case 'resolve': {
        const waiter = waiters.get(effect.ticket);
        waiters.delete(effect.ticket);
        waiter?.(effect.proposal);
        return;
      }
      case 'notify': {
        const view = viewOf(state);
        for (const listener of listeners) {
          try {
            listener(view, effect.proposal);
          } catch (error) {
            try {
              onListenerError(error);
            } catch {
              // Error reporting must not corrupt the state transition or prevent other listeners.
            }
          }
        }
        return;
      }
      case 'resubmit':
        dispatch({ type: 'submitted', ticket: effect.ticket, submission: effect.submission });
    }
  };

  // Effects run after the state they came from is committed, in order, one at a time, so a
  // listener that dispatches during a notification queues behind the effects already due.
  const dispatch = (event: SlugEvent): void => {
    const transition = reduceSlug(state, event);
    state = transition.state;
    queue.push(...transition.effects);
    if (running) {
      return;
    }
    running = true;
    try {
      while (queue.length > 0) {
        run(queue.shift()!);
      }
    } finally {
      running = false;
    }
  };

  const submit = (submission: Submission): Promise<SlugProposal> => {
    nextTicket += 1;
    const ticket = nextTicket;
    const promise = new Promise<SlugProposal>((resolveWaiter) => {
      waiters.set(ticket, resolveWaiter);
    });
    dispatch({ type: 'submitted', ticket, submission });
    return promise;
  };

  return {
    loaded(post) {
      dispatch({ type: 'loaded', slug: post.slug, title: post.title });
    },
    saveAcknowledged(submitted, acknowledged) {
      dispatch({ type: 'acknowledged', submitted, acknowledged });
    },
    titleCommitted(title) {
      return submit({ kind: 'title', value: title });
    },
    slugEdited(input) {
      return submit({ kind: 'manual', value: input });
    },
    getState: () => viewOf(state),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
