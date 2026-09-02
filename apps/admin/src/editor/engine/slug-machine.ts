import { slugify } from '@tryghost/string';
import { DEFAULT_TITLE } from './save-engine';

export const DUPLICATED_POST_TITLE_SUFFIX = '(Copy)';

export type SlugMode = 'derived' | 'custom';
export type SlugStatus = 'derived' | 'custom' | 'frozen';

export interface SlugMachineState {
  readonly status: SlugStatus;
  readonly mode: SlugMode;
  readonly slug: string;
  /** The title the slug was loaded with or last generated from. */
  readonly title: string;
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
}

/** Called on every state change; `proposal` is null when only `pending` changed or a post loaded. */
export type SlugListener = (state: SlugMachineState, proposal: SlugProposal | null) => void;

export interface SlugMachine {
  loaded(post: LoadedPost): void;
  titleCommitted(title: string): Promise<SlugProposal>;
  slugEdited(input: string): Promise<SlugProposal>;
  getState(): SlugMachineState;
  subscribe(listener: SlugListener): () => void;
}

// Mirrors Ember generateSlugTask: a slug that differs from slugify(saved title) is treated as
// custom unless the saved title is (Untitled) or ends with (Copy).
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

// Mirrors Ember updateSlugTask: keep the current slug when the server only appended an
// incrementor to it and the user did not type that exact value.
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
  if (increment > 0 && tokens.join('-') === currentSlug && serverSlug !== candidate) {
    return currentSlug;
  }
  return serverSlug;
}

export function createSlugMachine({ generateSlug }: SlugMachineOptions): SlugMachine {
  // Only load and an applied manual edit move settledMode; an in-flight manual edit reads as
  // custom so a title commit cannot race it.
  let settledMode: SlugMode = 'derived';
  const pendingManual = new Set<number>();
  let slug = '';
  let title = '';
  let inFlight = 0;
  // Every request takes a ticket; a response applies only while its ticket is still the latest.
  let latestTicket = 0;
  const listeners = new Set<SlugListener>();

  const mode = (): SlugMode => (pendingManual.size > 0 ? 'custom' : settledMode);

  const getState = (): SlugMachineState => {
    const currentMode = mode();
    const status: SlugStatus =
      currentMode === 'custom'
        ? 'custom'
        : shouldGenerateSlug({ mode: currentMode, slug }, title)
          ? 'derived'
          : 'frozen';
    return { status, mode: currentMode, slug, title, pending: inFlight > 0 };
  };

  const notify = (proposal: SlugProposal | null): void => {
    const state = getState();
    for (const listener of listeners) {
      listener(state, proposal);
    }
  };

  const emit = (proposal: SlugProposal): SlugProposal => {
    notify(proposal);
    return proposal;
  };

  const unchanged = (reason: UnchangedReason, error?: unknown): SlugProposal =>
    emit({ slug, source: 'unchanged', reason, ...(error !== undefined && { error }) });

  const request = async (
    text: string,
    manual: boolean,
  ): Promise<{ ticket: number; result?: string; error?: unknown }> => {
    latestTicket += 1;
    const ticket = latestTicket;
    inFlight += 1;
    if (manual) {
      pendingManual.add(ticket);
    }
    notify(null);
    try {
      return { ticket, result: await generateSlug(text) };
    } catch (error) {
      return { ticket, error };
    } finally {
      inFlight -= 1;
      pendingManual.delete(ticket);
    }
  };

  return {
    loaded(post) {
      latestTicket += 1;
      pendingManual.clear();
      slug = post.slug;
      title = post.title;
      settledMode = isCustomSlug(post.slug, post.title) ? 'custom' : 'derived';
      notify(null);
    },

    async titleCommitted(rawTitle) {
      const nextTitle = rawTitle.trim();
      if (mode() === 'custom') {
        return unchanged('custom');
      }
      if (nextTitle === title && slug) {
        return unchanged('same-title');
      }
      if (!shouldGenerateSlug({ mode: 'derived', slug }, nextTitle)) {
        return unchanged('frozen');
      }

      const { ticket, result, error } = await request(nextTitle, false);
      if (ticket !== latestTicket) {
        return unchanged('stale');
      }
      if (error !== undefined) {
        return unchanged('error', error);
      }
      if (!result) {
        return unchanged('empty-result');
      }
      slug = result;
      title = nextTitle;
      return emit({ slug, source: 'generated' });
    },

    async slugEdited(input) {
      const candidate = normalizeManualSlug(input, slug);
      if (candidate === null) {
        return unchanged('reverted');
      }

      const { ticket, result, error } = await request(candidate, true);
      if (ticket !== latestTicket) {
        return unchanged('stale');
      }
      if (error !== undefined) {
        return unchanged('error', error);
      }
      if (!result) {
        return unchanged('empty-result');
      }
      const resolved = resolveDedupedSlug(result, candidate, slug);
      if (resolved === slug) {
        return unchanged('reverted');
      }
      slug = resolved;
      settledMode = 'custom';
      return emit({ slug, source: 'manual' });
    },

    getState,

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
