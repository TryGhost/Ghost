import { dequal } from 'dequal';
import { lexicalEquals, type LexicalInput } from '@/editor/engine/lexical-compare';
import { pick } from '@/editor/engine/pick';
import { sameTag, type TagLike } from '@/shared/tags/tag-selection';

// Codes identify each dirty cause and callers match on them; nothing reports them.
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
}

export interface ChangeVerdict {
  dirty: boolean;
  reasons: ChangeReason[];
}

/** null until the create request has been acknowledged. */
export type PostId = string | null;

/** An editor read always carries the relation's id (content-types.ts). */
export interface PostRelationLike {
  id: string;
}

// Client-owned editable fields only; other server metadata lives with the save engine.
export interface EditablePostProjection {
  title: string;
  slug: string;
  lexical: string | null;
  tags: ReadonlyArray<TagLike>;
  custom_excerpt: string | null;
  feature_image: string | null;
  feature_image_alt: string | null;
  feature_image_caption: string | null;
  featured: boolean;
  visibility: string | null;
  tiers: ReadonlyArray<PostRelationLike>;
  authors: ReadonlyArray<PostRelationLike>;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  custom_template: string | null;
  codeinjection_head: string | null;
  codeinjection_foot: string | null;
  og_image: string | null;
  og_title: string | null;
  og_description: string | null;
  twitter_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  /** Pages only; the write contract strips it from post payloads. */
  show_title_and_feature_image: boolean | null;
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
  baselineFailed(postId: PostId): void;
  setLive(postId: PostId, patch: EditablePostPatch): void;
  markSaveError(): void;
  clearSaveError(): void;
  revisionRestored(postId: PostId, restored: RestoredRevision): void;
  verdict(): ChangeVerdict;
  /** Compares one editable field with the latest saved value using the dirty-check rules. */
  isFieldDirty(key: keyof EditablePostProjection): boolean;
  hasChangedSinceRevision(latestRevision: RevisionProjection | null | undefined): boolean;
  dispose(): void;
}

export type ProjectionKey = keyof EditablePostProjection;

const PROJECTION_KEYS: ReadonlyArray<ProjectionKey> = [
  'title',
  'slug',
  'lexical',
  'tags',
  'custom_excerpt',
  'feature_image',
  'feature_image_alt',
  'feature_image_caption',
  'featured',
  'visibility',
  'tiers',
  'authors',
  'meta_title',
  'meta_description',
  'canonical_url',
  'custom_template',
  'codeinjection_head',
  'codeinjection_foot',
  'og_image',
  'og_title',
  'og_description',
  'twitter_image',
  'twitter_title',
  'twitter_description',
  'show_title_and_feature_image',
  'updated_at',
];

/** Relations compare by identity; the rest of a related record is server-owned. */
const RELATION_KEYS: ReadonlySet<ProjectionKey> = new Set(['tiers', 'authors']);

const RUNG_KEYS: ReadonlySet<ProjectionKey> = new Set(['title', 'lexical', 'tags', 'updated_at']);

type Baseline =
  | { status: 'pending' }
  | { status: 'ready'; lexical: string | null }
  | { status: 'failed' };

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
  return clonePlain(pick(post, PROJECTION_KEYS));
}

function pickPatch(patch: EditablePostPatch): EditablePostPatch {
  const keys = PROJECTION_KEYS.filter((key) => key in patch && patch[key] !== undefined);
  return clonePlain(pick(patch, keys));
}

function serializeLexical(lexical: LexicalInput): string | null {
  if (lexical === null || lexical === undefined) {
    return null;
  }
  return typeof lexical === 'string' ? lexical : JSON.stringify(lexical);
}

// Order counts: it is the `sort_order` Ghost stores for the relation.
function sameTags(
  a: ReadonlyArray<TagLike> | undefined,
  b: ReadonlyArray<TagLike> | undefined,
): boolean {
  const left = a ?? [];
  const right = b ?? [];
  return left.length === right.length && left.every((tag, index) => sameTag(tag, right[index]));
}

// The server trims the title on save, so surrounding whitespace never persists.
function sameTitle(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

function relationIds(related: ReadonlyArray<PostRelationLike> | undefined): string[] {
  return (related ?? []).map((entry) => entry.id ?? '');
}

/**
 * The dirty-check compare for one field, minus `lexical`, whose semantic form
 * needs the site url the tracker was built with.
 */
export function sameFieldValue(key: ProjectionKey, a: unknown, b: unknown): boolean {
  if (key === 'title') {
    return sameTitle(a as string, b as string);
  }
  if (key === 'tags') {
    return sameTags(a as ReadonlyArray<TagLike>, b as ReadonlyArray<TagLike>);
  }
  if (RELATION_KEYS.has(key)) {
    return dequal(
      relationIds(a as ReadonlyArray<PostRelationLike>),
      relationIds(b as ReadonlyArray<PostRelationLike>),
    );
  }
  return dequal(a, b);
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
  let idAdopted = false;
  const heldIds = new Set<string>();
  let saved: EditablePostProjection | null = null;
  let live: EditablePostProjection | null = null;
  let baseline: Baseline = { status: 'pending' };
  let saveError = false;
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
    return sameFieldValue(key, a, b);
  }

  function isCurrent(id: PostId): boolean {
    return !disposed && saved !== null && id === postId;
  }

  // Editor-side events may still say null between a create ack and the caller learning the id.
  function isCurrentOrAlias(id: PostId): boolean {
    return isCurrent(id) || (id === null && idAdopted && !disposed && saved !== null);
  }

  function hasChangedAttribute(from: EditablePostProjection, to: EditablePostProjection): boolean {
    return PROJECTION_KEYS.some(
      (key) => !RUNG_KEYS.has(key) && !sameField(key, from[key], to[key]),
    );
  }

  function collectReasons(): ChangeReason[] {
    if (!saved || !live) {
      return [];
    }

    const reasons: ChangeReason[] = [];

    if (saveError) {
      reasons.push({ code: 'POST_HAS_ERROR' });
    }

    if (!sameTags(saved.tags, live.tags)) {
      reasons.push({ code: 'POST_TAGS_DIVERGED' });
    }

    if (!sameTitle(saved.title, live.title)) {
      reasons.push({ code: 'POST_TITLE_DIVERGED' });
    }

    const scratch = live.lexical;
    try {
      if (!sameLexical(saved.lexical, scratch)) {
        if (baseline.status === 'pending') {
          reasons.push({ code: 'BASELINE_PENDING' });
        } else if (baseline.status === 'failed') {
          reasons.push({ code: 'BASELINE_FAILED' });
        } else if (!sameLexical(baseline.lexical, scratch)) {
          reasons.push({ code: 'SCRATCH_DIVERGED_FROM_SECONDARY' });
        }
      }
    } catch {
      reasons.push({ code: 'LEXICAL_PARSE_FAILED' });
    }

    if (hasChangedAttribute(saved, live)) {
      reasons.push({
        code: postId === null ? 'NEW_POST_HAS_CHANGED_ATTRIBUTES' : 'POST_HAS_DIRTY_ATTRIBUTES',
      });
    }

    return reasons;
  }

  return {
    load(id, post) {
      if (disposed) {
        return;
      }
      postId = id;
      idAdopted = false;
      if (id !== null) {
        heldIds.add(id);
      }
      saved = pickProjection(post);
      live = pickProjection(post);
      baseline = { status: 'pending' };
      saveError = false;
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
    // Callers must build a fresh tracker per load(null) or fence stale completions
    // themselves; a new post only refuses acks for ids this tracker has already held.
    saveAcknowledged(id, submitted, acknowledged) {
      if (disposed || !saved || !live || (postId !== null && id !== postId)) {
        return;
      }
      if (postId === null && id !== null && heldIds.has(id)) {
        return;
      }
      const next = pickProjection(acknowledged);
      const rebasedKeys: ProjectionKey[] = [];
      for (const key of PROJECTION_KEYS) {
        const base = submitted[key] !== undefined ? submitted[key] : saved[key];
        if (key === 'updated_at' || sameField(key, live[key], base)) {
          rebasedKeys.push(key);
        }
      }
      if (postId === null && id !== null) {
        idAdopted = true;
        heldIds.add(id);
      }
      postId = id;
      // A field save can finish while Koenig is still normalizing the loaded
      // body. Keep that baseline when the persisted body has not changed.
      if (!sameField('lexical', saved.lexical, next.lexical)) {
        baseline = { status: 'ready', lexical: next.lexical };
      }
      saved = next;
      live = { ...live, ...pick(next, rebasedKeys) };
      saveError = false;
    },

    setBaseline(id, lexical) {
      if (!isCurrentOrAlias(id)) {
        return;
      }
      baseline = { status: 'ready', lexical: serializeLexical(lexical) };
    },

    baselineFailed(id) {
      if (!isCurrentOrAlias(id)) {
        return;
      }
      baseline = { status: 'failed' };
    },

    setLive(id, patch) {
      if (!isCurrentOrAlias(id) || !live) {
        return;
      }
      const defined = pickPatch(patch);
      delete defined.updated_at;
      live = { ...live, ...defined };
    },

    markSaveError() {
      if (disposed) {
        return;
      }
      saveError = true;
    },

    clearSaveError() {
      if (disposed) {
        return;
      }
      saveError = false;
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
      saveError = false;
    },

    verdict() {
      const reasons = collectReasons();
      return { dirty: reasons.length > 0, reasons };
    },

    isFieldDirty(key) {
      return !!saved && !!live && key !== 'updated_at' && !sameField(key, saved[key], live[key]);
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
        !sameTitle(saved.title, latestRevision.title) ||
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
      idAdopted = false;
      heldIds.clear();
      saved = null;
      live = null;
      baseline = { status: 'pending' };
      saveError = false;
    },
  };
}
