// Posts do not persist slug provenance, so ownership is inferred structurally at load.
// The full behavior contract is in README.md.
import { slugify } from '@tryghost/string';
import { DEFAULT_TITLE } from './save-engine';

export const DUPLICATED_POST_TITLE_SUFFIX = '(Copy)';

export type SlugMode = 'derived' | 'custom';
export type SlugStatus = 'derived' | 'custom' | 'frozen';

export interface SlugMachineState {
  readonly status: SlugStatus;
  readonly mode: SlugMode;
  readonly slug: string;
  /** The title the slug was loaded with or last generated from; drives the same-title check. */
  readonly title: string;
  /** The title from the latest titleCommitted call regardless of outcome; drives `status`. */
  readonly lastCommittedTitle: string;
  /** True while an applicable title or manual request is in flight. */
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

export type SlugSource = 'title' | 'manual';

export interface SlugSubmission {
  readonly source: SlugSource;
  /** The raw title or slug input, as the caller passed it. */
  readonly value: string;
}

/** The one submission waiting for the generator slot; a newer one replaces it. */
export interface DeferredSubmission {
  readonly submission: SlugSubmission;
  /** The slug when it was deferred; a `stale` answer reports it. */
  readonly slugAtSubmission: string;
}

interface SlugFields {
  /** The settled mode; a live manual request reads as `custom` on top of it. */
  readonly mode: SlugMode;
  readonly slug: string;
  readonly title: string;
  readonly lastCommittedTitle: string;
}

export type SlugState =
  | (SlugFields & {
      readonly kind: 'idle';
      /** The last ticket issued; the next submission takes the one after it. */
      readonly ticket: number;
    })
  | (SlugFields & {
      readonly kind: 'generating';
      /** Owns the generator slot until its submission settles; answers for other tickets drop. */
      readonly ticket: number;
      readonly source: SlugSource;
      /** The text sent for this ticket while its answer can still apply, otherwise null. */
      readonly request: string | null;
      readonly deferred: DeferredSubmission | null;
    });

export type SlugEvent =
  | { readonly kind: 'loaded'; readonly post: LoadedPost }
  | {
      readonly kind: 'acknowledged';
      readonly submitted: LoadedPost;
      readonly acknowledged: LoadedPost;
    }
  | { readonly kind: 'title-committed'; readonly title: string }
  | { readonly kind: 'slug-edited'; readonly input: string }
  | { readonly kind: 'answered'; readonly ticket: number; readonly result: string | undefined }
  | { readonly kind: 'failed'; readonly ticket: number; readonly error: unknown }
  | { readonly kind: 'released'; readonly ticket: number };

/** What the shell does after committing a step's state. */
export type SlugOutput =
  | { readonly kind: 'silent' }
  | { readonly kind: 'changed' }
  | { readonly kind: 'proposed'; readonly proposal: SlugProposal }
  | { readonly kind: 'requested'; readonly ticket: number; readonly text: string }
  | { readonly kind: 'refused'; readonly ticket: number; readonly proposal: SlugProposal }
  | { readonly kind: 'deferred'; readonly deferred: DeferredSubmission };

type SubmissionEvent = Extract<SlugEvent, { kind: 'title-committed' | 'slug-edited' }>;
type StartOutput = Extract<SlugOutput, { kind: 'requested' | 'refused' }>;
type SubmissionOutput = StartOutput | Extract<SlugOutput, { kind: 'proposed' | 'deferred' }>;

export interface SlugStep<Output extends SlugOutput = SlugOutput> {
  readonly state: SlugState;
  readonly output: Output;
  /** A deferred submission this step discarded; it resolves `stale`. */
  readonly dropped?: DeferredSubmission;
  /** The deferred submission this step started. */
  readonly promoted?: DeferredSubmission;
}

type IdleState = Extract<SlugState, { kind: 'idle' }>;
type GeneratingState = Extract<SlugState, { kind: 'generating' }>;

export const INITIAL_SLUG_STATE: SlugState = {
  kind: 'idle',
  ticket: 0,
  mode: 'derived',
  slug: '',
  title: '',
  lastCommittedTitle: '',
};

const SILENT: SlugOutput = { kind: 'silent' };

function unchanged(slug: string, reason: UnchangedReason, error?: unknown): SlugProposal {
  return { slug, source: 'unchanged', reason, ...(error !== undefined && { error }) };
}

function fields(state: SlugState): SlugFields {
  const { mode, slug, title, lastCommittedTitle } = state;
  return { mode, slug, title, lastCommittedTitle };
}

export function viewSlugState(state: SlugState): SlugMachineState {
  const live = state.kind === 'generating' && state.request !== null;
  const mode = live && state.source === 'manual' ? 'custom' : state.mode;
  const status: SlugStatus =
    mode === 'custom'
      ? 'custom'
      : shouldGenerateSlug({ mode, slug: state.slug }, state.lastCommittedTitle)
        ? 'derived'
        : 'frozen';
  return {
    status,
    mode,
    slug: state.slug,
    title: state.title,
    lastCommittedTitle: state.lastCommittedTitle,
    pending: live,
  };
}

// The submission takes the slot even when refused; the slot frees when its promise settles.
function start(state: IdleState, submission: SlugSubmission): SlugStep<StartOutput> {
  const ticket = state.ticket + 1;
  const hold = (patch: Partial<SlugFields>, request: string | null): GeneratingState => ({
    ...fields(state),
    ...patch,
    kind: 'generating',
    ticket,
    source: submission.source,
    request,
    deferred: null,
  });
  const refuse = (next: GeneratingState, reason: UnchangedReason): SlugStep<StartOutput> => ({
    state: next,
    output: { kind: 'refused', ticket, proposal: unchanged(next.slug, reason) },
  });

  if (submission.source === 'title') {
    const title = submission.value.trim();
    if (state.mode === 'custom') {
      return refuse(hold({ lastCommittedTitle: title }, null), 'custom');
    }
    if (title === state.title && state.slug) {
      return refuse(hold({ lastCommittedTitle: title }, null), 'same-title');
    }
    if (!shouldGenerateSlug({ mode: 'derived', slug: state.slug }, title)) {
      return refuse(hold({ lastCommittedTitle: title }, null), 'frozen');
    }
    return {
      state: hold({ lastCommittedTitle: title }, title),
      output: { kind: 'requested', ticket, text: title },
    };
  }

  const candidate = normalizeManualSlug(submission.value, state.slug);
  if (candidate === null) {
    return refuse(hold({}, null), 'reverted');
  }
  return {
    state: hold({}, candidate),
    output: { kind: 'requested', ticket, text: candidate },
  };
}

function receive(state: SlugState, submission: SlugSubmission): SlugStep<SubmissionOutput> {
  if (state.kind === 'idle') {
    return start(state, submission);
  }
  const dropped = state.deferred ?? undefined;

  // A blank or unchanged slug withdraws a deferred edit, and the live request of a manual slot.
  if (
    submission.source === 'manual' &&
    normalizeManualSlug(submission.value, state.slug) === null
  ) {
    const dropsDeferred = state.deferred?.submission.source === 'manual';
    return {
      state: {
        ...state,
        request: state.source === 'manual' ? null : state.request,
        deferred: dropsDeferred ? null : state.deferred,
      },
      output: { kind: 'proposed', proposal: unchanged(state.slug, 'reverted') },
      ...(dropsDeferred && { dropped }),
    };
  }

  const title = submission.value.trim();
  const titleOnTitle = submission.source === 'title' && state.source === 'title';
  if (titleOnTitle) {
    const reason: UnchangedReason | null =
      title === state.title && state.slug
        ? 'same-title'
        : shouldGenerateSlug({ mode: 'derived', slug: state.slug }, title)
          ? null
          : 'frozen';
    if (reason) {
      return {
        state: { ...state, lastCommittedTitle: title, request: null, deferred: null },
        output: { kind: 'proposed', proposal: unchanged(state.slug, reason) },
        dropped,
      };
    }
  }

  const deferred: DeferredSubmission = { submission, slugAtSubmission: state.slug };
  return {
    state: { ...state, ...(titleOnTitle && { lastCommittedTitle: title }), deferred },
    output: { kind: 'deferred', deferred },
    dropped,
  };
}

function answer(
  state: SlugState,
  event: Extract<SlugEvent, { kind: 'answered' | 'failed' }>,
): SlugStep {
  if (state.kind !== 'generating' || state.ticket !== event.ticket || state.request === null) {
    return { state, output: SILENT };
  }
  const text = state.request;
  const answered: GeneratingState = { ...state, request: null };
  const propose = (next: GeneratingState, proposal: SlugProposal): SlugStep => ({
    state: next,
    output: { kind: 'proposed', proposal },
  });

  if (event.kind === 'failed') {
    return propose(answered, unchanged(state.slug, 'error', event.error));
  }
  const result = event.result;
  if (!result?.trim()) {
    return propose(answered, unchanged(state.slug, 'empty-result'));
  }
  if (state.source === 'title') {
    return propose(
      { ...answered, slug: result, title: text },
      { slug: result, source: 'generated' },
    );
  }
  const resolved = resolveDedupedSlug(result, text, state.slug);
  if (resolved === state.slug) {
    return propose(answered, unchanged(state.slug, 'reverted'));
  }
  return propose(
    { ...answered, slug: resolved, mode: 'custom' },
    { slug: resolved, source: 'manual' },
  );
}

function release(state: SlugState, ticket: number): SlugStep {
  if (state.kind !== 'generating' || state.ticket !== ticket) {
    return { state, output: SILENT };
  }
  const idle: IdleState = { ...fields(state), kind: 'idle', ticket };
  if (!state.deferred) {
    return { state: idle, output: SILENT };
  }
  return { ...start(idle, state.deferred.submission), promoted: state.deferred };
}

function acknowledge(state: SlugState, submitted: LoadedPost, acknowledged: LoadedPost): SlugStep {
  const slugChanged = state.slug === submitted.slug && state.slug !== acknowledged.slug;
  const titleChanged = state.title === submitted.title && state.title !== acknowledged.title;
  if (!slugChanged && !titleChanged) {
    return { state, output: SILENT };
  }
  return {
    state: {
      ...state,
      ...(slugChanged && { slug: acknowledged.slug }),
      ...(titleChanged && {
        title: acknowledged.title,
        ...(state.lastCommittedTitle === submitted.title && {
          lastCommittedTitle: acknowledged.title,
        }),
      }),
    },
    output: { kind: 'changed' },
  };
}

export function transition(state: SlugState, event: SubmissionEvent): SlugStep<SubmissionOutput>;
export function transition(state: SlugState, event: SlugEvent): SlugStep;
export function transition(state: SlugState, event: SlugEvent): SlugStep {
  switch (event.kind) {
    case 'loaded': {
      const { slug, title } = event.post;
      return {
        state: {
          kind: 'idle',
          ticket: state.ticket,
          mode: isCustomSlug(slug, title) ? 'custom' : 'derived',
          slug,
          title,
          lastCommittedTitle: title,
        },
        output: { kind: 'changed' },
        ...(state.kind === 'generating' && state.deferred && { dropped: state.deferred }),
      };
    }
    case 'acknowledged':
      return acknowledge(state, event.submitted, event.acknowledged);
    case 'title-committed':
      return receive(state, { source: 'title', value: event.title });
    case 'slug-edited':
      return receive(state, { source: 'manual', value: event.input });
    case 'answered':
    case 'failed':
      return answer(state, event);
    case 'released':
      return release(state, event.ticket);
  }
}

type Waiter = { resolve: (proposal: SlugProposal) => void; reject: (error: unknown) => void };

export function createSlugMachine({
  generateSlug,
  onListenerError,
}: SlugMachineOptions): SlugMachine {
  let state = INITIAL_SLUG_STATE;
  const listeners = new Set<SlugListener>();
  const waiters = new Map<DeferredSubmission, Waiter>();

  const stale = (slug: string): SlugProposal => unchanged(slug, 'stale');

  const notify = (proposal: SlugProposal | null): void => {
    const view = viewSlugState(state);
    for (const listener of listeners) {
      try {
        listener(view, proposal);
      } catch (error) {
        try {
          onListenerError(error);
        } catch {
          // Error reporting must not corrupt the state transition or prevent other listeners.
        }
      }
    }
  };

  function dispatch(event: SubmissionEvent): SlugStep<SubmissionOutput>;
  function dispatch(event: SlugEvent): SlugStep;
  function dispatch(event: SlugEvent): SlugStep {
    const step = transition(state, event);
    state = step.state;
    if (step.dropped) {
      waiters.get(step.dropped)?.resolve(stale(step.dropped.slugAtSubmission));
      waiters.delete(step.dropped);
    }
    const { output } = step;
    if (output.kind === 'changed' || output.kind === 'requested') {
      notify(null);
    } else if (output.kind === 'proposed' || output.kind === 'refused') {
      notify(output.proposal);
    }
    return step;
  }

  // Two awaits deep: callers and listeners see an answer two microtasks after the generator.
  const request = async (text: string): Promise<{ result?: string; error?: unknown }> => {
    try {
      return { result: await generateSlug(text) };
    } catch (error) {
      return { error };
    }
  };

  const execute = async (output: StartOutput, slugAtRequest: string): Promise<SlugProposal> => {
    if (output.kind === 'refused') {
      return output.proposal;
    }
    const { result, error } = await request(output.text);
    const answered = dispatch(
      error !== undefined
        ? { kind: 'failed', ticket: output.ticket, error }
        : { kind: 'answered', ticket: output.ticket, result },
    );
    return answered.output.kind === 'proposed' ? answered.output.proposal : stale(slugAtRequest);
  };

  const run = (output: StartOutput, slugAtRequest: string): Promise<SlugProposal> => {
    const settled = execute(output, slugAtRequest);
    const released = (): void => {
      const next = dispatch({ kind: 'released', ticket: output.ticket });
      const waiter = next.promoted && waiters.get(next.promoted);
      if (!next.promoted || !waiter) {
        return;
      }
      if (next.output.kind === 'requested' || next.output.kind === 'refused') {
        waiters.delete(next.promoted);
        void run(next.output, next.state.slug).then(waiter.resolve, waiter.reject);
      }
    };
    void settled.then(released, released);
    return settled;
  };

  const submit = (event: SubmissionEvent): Promise<SlugProposal> => {
    const { state: next, output } = dispatch(event);
    switch (output.kind) {
      case 'requested':
      case 'refused':
        return run(output, next.slug);
      case 'proposed':
        return Promise.resolve(output.proposal);
      case 'deferred':
        return new Promise<SlugProposal>((resolve, reject) => {
          waiters.set(output.deferred, { resolve, reject });
        });
    }
  };

  return {
    loaded(post) {
      dispatch({ kind: 'loaded', post });
    },

    saveAcknowledged(submitted, acknowledged) {
      dispatch({ kind: 'acknowledged', submitted, acknowledged });
    },

    titleCommitted(title) {
      return submit({ kind: 'title-committed', title });
    },

    slugEdited(input) {
      return submit({ kind: 'slug-edited', input });
    },

    getState: () => viewSlugState(state),

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
