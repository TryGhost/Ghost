import { slugify } from '@tryghost/string';
import { DEFAULT_TITLE } from './save-engine';

export const DUPLICATED_POST_TITLE_SUFFIX = '(Copy)';

export type SlugMode = 'derived' | 'custom';
export type SlugStatus = 'derived' | 'custom' | 'frozen';

export interface SlugMachineState {
  readonly status: SlugStatus;
  readonly mode: SlugMode;
  readonly slug: string;
  readonly title: string;
  readonly isNew: boolean;
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
  readonly isNew: boolean;
}

export interface SlugMachineOptions {
  /** Port for GET /slugs/post/:name/:id — receives the raw text, returns the deduplicated slug. */
  generateSlug: (text: string) => Promise<string>;
}

export type SlugListener = (proposal: SlugProposal, state: SlugMachineState) => void;

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
  let mode: SlugMode = 'derived';
  let slug = '';
  let title = '';
  let isNew = true;
  let inFlight = 0;
  // Every request takes a ticket; a response applies only while its ticket is still the latest.
  let latestTicket = 0;
  const listeners = new Set<SlugListener>();

  const getState = (): SlugMachineState => {
    const status: SlugStatus =
      mode === 'custom'
        ? 'custom'
        : shouldGenerateSlug({ mode, slug }, title)
          ? 'derived'
          : 'frozen';
    return { status, mode, slug, title, isNew, pending: inFlight > 0 };
  };

  const emit = (proposal: SlugProposal): SlugProposal => {
    const state = getState();
    for (const listener of listeners) {
      listener(proposal, state);
    }
    return proposal;
  };

  const unchanged = (reason: UnchangedReason, error?: unknown): SlugProposal =>
    emit({ slug, source: 'unchanged', reason, ...(error !== undefined && { error }) });

  const request = async (
    text: string,
  ): Promise<{ ticket: number; result?: string; error?: unknown }> => {
    latestTicket += 1;
    const ticket = latestTicket;
    inFlight += 1;
    try {
      return { ticket, result: await generateSlug(text) };
    } catch (error) {
      return { ticket, error };
    } finally {
      inFlight -= 1;
    }
  };

  return {
    loaded(post) {
      latestTicket += 1;
      slug = post.slug;
      title = post.title;
      isNew = post.isNew;
      mode = isCustomSlug(post.slug, post.title) ? 'custom' : 'derived';
    },

    async titleCommitted(rawTitle) {
      const nextTitle = rawTitle.trim();
      if (nextTitle === title && slug) {
        return unchanged('same-title');
      }
      title = nextTitle;
      if (mode === 'custom') {
        return unchanged('custom');
      }
      if (!shouldGenerateSlug({ mode, slug }, nextTitle)) {
        return unchanged('frozen');
      }

      const { ticket, result, error } = await request(nextTitle);
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
      return emit({ slug, source: 'generated' });
    },

    async slugEdited(input) {
      const candidate = normalizeManualSlug(input, slug);
      if (candidate === null) {
        return unchanged('reverted');
      }

      const previousMode = mode;
      mode = 'custom';
      const { ticket, result, error } = await request(candidate);
      if (ticket !== latestTicket) {
        return unchanged('stale');
      }
      if (error !== undefined) {
        mode = previousMode;
        return unchanged('error', error);
      }
      if (!result) {
        mode = previousMode;
        return unchanged('empty-result');
      }
      const resolved = resolveDedupedSlug(result, candidate, slug);
      if (resolved === slug) {
        mode = previousMode;
        return unchanged('reverted');
      }
      slug = resolved;
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
