import { dequal } from 'dequal';
import {
  humanizeLexicalDiff,
  lexicalEquals,
  stripSiteUrl,
  type HumanizedDiffEntry,
  type LexicalInput,
} from '@/editor/engine/lexical-compare';

// Codes are reported to Sentry when the leave modal opens; keep them stable.
export type ChangeReasonCode =
  | 'POST_HAS_ERROR'
  | 'POST_TAGS_DIVERGED'
  | 'POST_TITLE_DIVERGED'
  | 'SCRATCH_DIVERGED_FROM_SECONDARY'
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

export interface PostTagLike {
  name: string;
}

export type PostAttributes = Record<string, unknown>;

export interface SavedPostState {
  isNew: boolean;
  title: string;
  lexical: string | null;
  tags: ReadonlyArray<PostTagLike>;
  attributes?: PostAttributes;
}

export interface LivePostState {
  title?: string;
  lexical?: string | null;
  tags?: ReadonlyArray<PostTagLike>;
  attributes?: PostAttributes;
}

export interface VerdictOptions {
  includeDiff?: boolean;
}

export interface ChangeTracker {
  setSaved(saved: SavedPostState): void;
  setBaseline(lexical: LexicalInput): void;
  setLive(live: LivePostState): void;
  markSaveError(messages?: unknown): void;
  clearSaveError(): void;
  revisionRestored(lexical: LexicalInput): void;
  verdict(options?: VerdictOptions): ChangeVerdict;
  hasChangedSinceRevision(
    latestRevisionLexical: string | null | undefined,
    siteUrl: string,
  ): boolean;
  reset(): void;
}

interface SaveError {
  messages: unknown;
}

function tagNames(tags: ReadonlyArray<PostTagLike> | undefined): string {
  return (tags ?? []).map((tag) => tag.name).join(', ');
}

function serializeLexical(lexical: LexicalInput): string | null {
  if (lexical === null || lexical === undefined) {
    return null;
  }
  return typeof lexical === 'string' ? lexical : JSON.stringify(lexical);
}

function changedAttributes(
  saved: PostAttributes,
  live: PostAttributes,
): Record<string, [unknown, unknown]> {
  const changed: Record<string, [unknown, unknown]> = {};
  for (const key of new Set([...Object.keys(saved), ...Object.keys(live)])) {
    if (!dequal(saved[key], live[key])) {
      changed[key] = [saved[key], live[key]];
    }
  }
  return changed;
}

export function createChangeTracker(): ChangeTracker {
  let saved: SavedPostState | null = null;
  let baseline: string | null = null;
  let live: LivePostState = {};
  let saveError: SaveError | null = null;

  function collectReasons(): ChangeReason[] {
    if (!saved) {
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
    if (currentTags !== previousTags) {
      reasons.push({
        code: 'POST_TAGS_DIVERGED',
        reason: 'tags are different',
        context: { currentTags, previousTags },
      });
    }

    const scratchTitle = live.title ?? '';
    if (scratchTitle.trim() !== saved.title.trim()) {
      reasons.push({
        code: 'POST_TITLE_DIVERGED',
        reason: 'title is different',
        context: { current: saved.title, scratch: scratchTitle },
      });
    }

    const scratch = live.lexical ?? null;
    if (baseline && scratch) {
      try {
        const divergedFromBaseline = !lexicalEquals(baseline, scratch);
        const divergedFromSaved = !lexicalEquals(saved.lexical, scratch);
        if (divergedFromBaseline && divergedFromSaved) {
          reasons.push({
            code: 'SCRATCH_DIVERGED_FROM_SECONDARY',
            reason: 'main editor content has diverged from both hidden editor and saved content',
            context: { secondaryLexical: baseline, lexical: saved.lexical, scratch },
          });
        }
      } catch (error) {
        reasons.push({
          code: 'LEXICAL_PARSE_FAILED',
          reason: 'lexical state could not be parsed for comparison',
          context: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    }

    const changed = changedAttributes(saved.attributes ?? {}, live.attributes ?? {});
    if (Object.keys(changed).length > 0) {
      reasons.push(
        saved.isNew
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
    setSaved(next) {
      if (saved) {
        baseline = next.lexical;
      }
      saved = next;
      saveError = null;
      live = {
        title: live.title ?? next.title,
        lexical: live.lexical === undefined ? next.lexical : live.lexical,
        tags: live.tags ?? next.tags,
        attributes: live.attributes ?? next.attributes,
      };
    },

    setBaseline(lexical) {
      baseline = serializeLexical(lexical);
    },

    setLive(next) {
      const defined = Object.fromEntries(
        Object.entries(next).filter(([, value]) => value !== undefined),
      ) as LivePostState;
      live = { ...live, ...defined };
    },

    markSaveError(messages) {
      saveError = { messages };
    },

    clearSaveError() {
      saveError = null;
    },

    // Call only after the restore save is acknowledged: Ember updates the
    // editors on success, so a failed restore never reaches the baseline.
    revisionRestored(lexical) {
      const restored = serializeLexical(lexical);
      baseline = restored;
      live = { ...live, lexical: restored };
    },

    verdict(options = {}) {
      const reasons = collectReasons();
      const result: ChangeVerdict = { dirty: reasons.length > 0, reasons };

      if (
        options.includeDiff &&
        reasons.some((r) => r.code === 'SCRATCH_DIVERGED_FROM_SECONDARY')
      ) {
        result.diff = humanizeLexicalDiff(baseline, live.lexical);
      }

      return result;
    },

    hasChangedSinceRevision(latestRevisionLexical, siteUrl) {
      if (!saved) {
        return false;
      }
      if (latestRevisionLexical === null || latestRevisionLexical === undefined) {
        return true;
      }
      if (saved.isNew) {
        return false;
      }
      return (
        stripSiteUrl(saved.lexical ?? '', siteUrl) !== stripSiteUrl(latestRevisionLexical, siteUrl)
      );
    },

    reset() {
      saved = null;
      baseline = null;
      live = {};
      saveError = null;
    },
  };
}
