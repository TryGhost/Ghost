import { dequal } from 'dequal';
import {
  humanizeLexicalDiff,
  lexicalEquals,
  type HumanizedDiffEntry,
  type LexicalInput,
} from '@/editor/engine/lexical-compare';

// Codes are reported to Sentry when the leave modal opens; keep them stable.
export type ChangeReasonCode =
  | 'POST_HAS_ERROR'
  | 'POST_TAGS_DIVERGED'
  | 'POST_TITLE_DIVERGED'
  | 'SCRATCH_DIVERGED_FROM_SECONDARY'
  | 'BASELINE_PENDING'
  | 'BASELINE_FAILED'
  | 'LEXICAL_PARSE_FAILED'
  | 'NEW_POST_HAS_CHANGED_ATTRIBUTES'
  | 'POST_HAS_DIRTY_ATTRIBUTES';

export interface ChangeReason {
  code: ChangeReasonCode;
  reason: string;
  context: Record<string, unknown>;
}

export interface ChangeVerdict {
  dirty: boolean;
  reasons: ChangeReason[];
  diff?: HumanizedDiffEntry[];
}

/** null until the create request has been acknowledged. */
export type PostId = string | null;

export interface PostTagLike {
  name?: string;
}

// Client-owned editable fields only; other server metadata lives with the save engine.
export interface EditablePostProjection {
  title: string;
  slug: string;
  lexical: string | null;
  tags: ReadonlyArray<PostTagLike>;
  custom_excerpt: string | null;
  feature_image: string | null;
  feature_image_alt: string | null;
  feature_image_caption: string | null;
  /** Server collision token: carried and rebased, never a dirty signal. */
  updated_at: string | null;
}

export type EditablePostPatch = Partial<EditablePostProjection>;

export type RestoredRevision = Pick<
  EditablePostProjection,
  | 'lexical'
  | 'title'
  | 'custom_excerpt'
  | 'feature_image'
  | 'feature_image_alt'
  | 'feature_image_caption'
>;

// The server's own revision projection (post-revisions.ts).
export interface RevisionProjection {
  lexical: string | null;
  title: string;
  custom_excerpt?: string | null;
  feature_image?: string | null;
}

export interface VerdictOptions {
  includeDiff?: boolean;
}

export interface ChangeTrackerOptions {
  siteUrl?: string;
}

export interface ChangeTracker {
  load(postId: PostId, post: EditablePostProjection): void;
  setSaved(postId: PostId, post: EditablePostProjection): void;
  saveAcknowledged(
    postId: PostId,
    submitted: EditablePostPatch,
    acknowledged: EditablePostProjection,
  ): void;
  setBaseline(postId: PostId, lexical: LexicalInput): void;
  baselineFailed(postId: PostId, error: unknown): void;
  setLive(postId: PostId, patch: EditablePostPatch): void;
  markSaveError(messages?: unknown): void;
  clearSaveError(): void;
  revisionRestored(postId: PostId, restored: RestoredRevision): void;
  verdict(options?: VerdictOptions): ChangeVerdict;
  hasChangedSinceRevision(latestRevision: RevisionProjection | null | undefined): boolean;
  dispose(): void;
}

type ProjectionKey = keyof EditablePostProjection;

const PROJECTION_KEYS: ReadonlyArray<ProjectionKey> = [
  'title',
  'slug',
  'lexical',
  'tags',
  'custom_excerpt',
  'feature_image',
  'feature_image_alt',
  'feature_image_caption',
  'updated_at',
];

const RUNG_KEYS: ReadonlySet<ProjectionKey> = new Set(['title', 'lexical', 'tags', 'updated_at']);

type Baseline =
  | { status: 'pending' }
  | { status: 'ready'; lexical: string | null }
  | { status: 'failed'; error: string };

interface SaveError {
  messages: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clonePlain<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(clonePlain) as T;
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, clonePlain(entry)]),
    ) as T;
  }
  return value;
}

function pickProjection(post: EditablePostProjection): EditablePostProjection {
  const out: Record<string, unknown> = {};
  for (const key of PROJECTION_KEYS) {
    out[key] = clonePlain(post[key]);
  }
  return out as unknown as EditablePostProjection;
}

function pickPatch(patch: EditablePostPatch): EditablePostPatch {
  const out: Record<string, unknown> = {};
  for (const key of PROJECTION_KEYS) {
    if (key in patch && patch[key] !== undefined) {
      out[key] = clonePlain(patch[key]);
    }
  }
  return out;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function serializeLexical(lexical: LexicalInput): string | null {
  if (lexical === null || lexical === undefined) {
    return null;
  }
  return typeof lexical === 'string' ? lexical : JSON.stringify(lexical);
}

function tagNames(tags: ReadonlyArray<PostTagLike> | undefined): string[] {
  return (tags ?? []).map((tag) => tag.name ?? '');
}

function isOlderToken(candidate: string | null, held: string | null): boolean {
  if (candidate === null || held === null) {
    return false;
  }
  const candidateTime = Date.parse(candidate);
  const heldTime = Date.parse(held);
  return !Number.isNaN(candidateTime) && !Number.isNaN(heldTime) && candidateTime < heldTime;
}

export function createChangeTracker(options: ChangeTrackerOptions = {}): ChangeTracker {
  const siteUrl = options.siteUrl ?? '';
  let postId: PostId = null;
  let saved: EditablePostProjection | null = null;
  let live: EditablePostProjection | null = null;
  let baseline: Baseline = { status: 'pending' };
  let saveError: SaveError | null = null;
  let disposed = false;

  function sameLexical(a: string | null, b: string | null): boolean {
    return lexicalEquals(a, b, siteUrl);
  }

  function sameField(key: ProjectionKey, a: unknown, b: unknown): boolean {
    if (key === 'lexical') {
      try {
        return sameLexical(a as string | null, b as string | null);
      } catch {
        return false;
      }
    }
    if (key === 'tags') {
      return dequal(
        tagNames(a as ReadonlyArray<PostTagLike>),
        tagNames(b as ReadonlyArray<PostTagLike>),
      );
    }
    return dequal(a, b);
  }

  function isCurrent(id: PostId): boolean {
    return !disposed && saved !== null && id === postId;
  }

  function changedAttributes(): Record<string, [unknown, unknown]> {
    const changed: Record<string, [unknown, unknown]> = {};
    if (!saved || !live) {
      return changed;
    }
    for (const key of PROJECTION_KEYS) {
      if (!RUNG_KEYS.has(key) && !sameField(key, saved[key], live[key])) {
        changed[key] = [saved[key], live[key]];
      }
    }
    return changed;
  }

  function collectReasons(): ChangeReason[] {
    if (!saved || !live) {
      return [];
    }

    const reasons: ChangeReason[] = [];

    if (saveError) {
      reasons.push({
        code: 'POST_HAS_ERROR',
        reason: 'isError',
        context: { messages: saveError.messages },
      });
    }

    const currentTags = tagNames(live.tags);
    const previousTags = tagNames(saved.tags);
    if (!dequal(currentTags, previousTags)) {
      reasons.push({
        code: 'POST_TAGS_DIVERGED',
        reason: 'tags are different',
        context: { currentTags, previousTags },
      });
    }

    if (live.title.trim() !== saved.title.trim()) {
      reasons.push({
        code: 'POST_TITLE_DIVERGED',
        reason: 'title is different',
        context: { current: saved.title, scratch: live.title },
      });
    }

    const scratch = live.lexical;
    try {
      if (!sameLexical(saved.lexical, scratch)) {
        if (baseline.status === 'pending') {
          reasons.push({
            code: 'BASELINE_PENDING',
            reason:
              'main editor content has diverged from saved content before the hidden editor reported',
            context: { lexical: saved.lexical, scratch },
          });
        } else if (baseline.status === 'failed') {
          reasons.push({
            code: 'BASELINE_FAILED',
            reason:
              'main editor content has diverged from saved content and the hidden editor failed',
            context: { lexical: saved.lexical, scratch, error: baseline.error },
          });
        } else if (!sameLexical(baseline.lexical, scratch)) {
          reasons.push({
            code: 'SCRATCH_DIVERGED_FROM_SECONDARY',
            reason: 'main editor content has diverged from both hidden editor and saved content',
            context: { secondaryLexical: baseline.lexical, lexical: saved.lexical, scratch },
          });
        }
      }
    } catch (error) {
      reasons.push({
        code: 'LEXICAL_PARSE_FAILED',
        reason: 'lexical state could not be parsed for comparison',
        context: { error: errorMessage(error) },
      });
    }

    const changed = changedAttributes();
    if (Object.keys(changed).length > 0) {
      reasons.push(
        postId === null
          ? {
              code: 'NEW_POST_HAS_CHANGED_ATTRIBUTES',
              reason: 'post.changedAttributes.length > 0',
              context: changed,
            }
          : {
              code: 'POST_HAS_DIRTY_ATTRIBUTES',
              reason: 'post.hasDirtyAttributes === true',
              context: changed,
            },
      );
    }

    return reasons;
  }

  return {
    load(id, post) {
      if (disposed) {
        return;
      }
      postId = id;
      saved = pickProjection(post);
      live = pickProjection(post);
      baseline = { status: 'pending' };
      saveError = null;
    },

    // Query data (load, refetch) never moves the baseline or the live state;
    // a refetch older than the held collision token is stale and dropped.
    setSaved(id, post) {
      if (!isCurrent(id) || !saved || !live) {
        return;
      }
      const next = pickProjection(post);
      if (isOlderToken(next.updated_at, saved.updated_at)) {
        return;
      }
      saved = next;
      live = { ...live, updated_at: next.updated_at };
    },

    // Single-flight save engine with one coalescing pending slot: acknowledgements
    // arrive in submit order, so no save-attempt id is needed here.
    saveAcknowledged(id, submitted, acknowledged) {
      if (disposed || !saved || !live || (postId !== null && id !== postId)) {
        return;
      }
      const next = pickProjection(acknowledged);
      const rebased: Record<string, unknown> = { ...live };
      for (const key of PROJECTION_KEYS) {
        const base = key in submitted ? submitted[key] : saved[key];
        if (key === 'updated_at' || sameField(key, live[key], base)) {
          rebased[key] = next[key];
        }
      }
      postId = id;
      saved = next;
      live = rebased as unknown as EditablePostProjection;
      baseline = { status: 'ready', lexical: next.lexical };
      saveError = null;
    },

    setBaseline(id, lexical) {
      if (!isCurrent(id)) {
        return;
      }
      baseline = { status: 'ready', lexical: serializeLexical(lexical) };
    },

    baselineFailed(id, error) {
      if (!isCurrent(id)) {
        return;
      }
      baseline = { status: 'failed', error: errorMessage(error) };
    },

    setLive(id, patch) {
      if (!isCurrent(id) || !live) {
        return;
      }
      const defined = pickPatch(patch);
      delete defined.updated_at;
      live = { ...live, ...defined };
    },

    markSaveError(messages) {
      if (disposed) {
        return;
      }
      saveError = { messages };
    },

    clearSaveError() {
      if (disposed) {
        return;
      }
      saveError = null;
    },

    // Call only after the restore save is acknowledged; a failed restore never reaches here.
    revisionRestored(id, restored) {
      if (!isCurrent(id) || !saved || !live) {
        return;
      }
      const adopted = clonePlain({
        lexical: restored.lexical,
        title: restored.title,
        custom_excerpt: restored.custom_excerpt,
        feature_image: restored.feature_image,
        feature_image_alt: restored.feature_image_alt,
        feature_image_caption: restored.feature_image_caption,
      });
      saved = { ...saved, ...adopted };
      live = { ...live, ...adopted };
      baseline = { status: 'pending' };
      saveError = null;
    },

    verdict({ includeDiff = false } = {}) {
      const reasons = collectReasons();
      const result: ChangeVerdict = { dirty: reasons.length > 0, reasons };

      if (
        includeDiff &&
        baseline.status === 'ready' &&
        reasons.some((r) => r.code === 'SCRATCH_DIVERGED_FROM_SECONDARY')
      ) {
        result.diff = humanizeLexicalDiff(baseline.lexical, live?.lexical, siteUrl);
      }

      return result;
    },

    hasChangedSinceRevision(latestRevision) {
      if (disposed || !saved) {
        return false;
      }
      if (!latestRevision) {
        return true;
      }
      if (postId === null) {
        return false;
      }
      if (
        saved.title !== latestRevision.title ||
        saved.custom_excerpt !== (latestRevision.custom_excerpt ?? null) ||
        saved.feature_image !== (latestRevision.feature_image ?? null)
      ) {
        return true;
      }
      try {
        return !sameLexical(saved.lexical, latestRevision.lexical);
      } catch {
        return true;
      }
    },

    dispose() {
      disposed = true;
      postId = null;
      saved = null;
      live = null;
      baseline = { status: 'pending' };
      saveError = null;
    },
  };
}
