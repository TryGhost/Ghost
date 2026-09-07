import { buildPostView, type PostViewColor } from '@/posts/list/post-views';
import { normalizeSharedViewName } from '@/members/api';
import type { PostListParams } from '@/posts/list/post-query-params';
import type { SharedView } from '@/members/api';

/**
 * Reading and writing the posts entries of the shared `shared_views` setting,
 * without disturbing anything else in it.
 *
 * Members, posts and pages all share this one setting. The obvious approach —
 * parse, validate, re-serialize — silently deletes any entry the current build
 * can't validate, including views written by a future version. That is data
 * loss the user is never warned about, so this works on the **raw** array and
 * re-serializes only the entry it actually changes.
 *
 * It also refuses to write at all when the stored value can't be read, rather
 * than treating it as an empty list and replacing the lot.
 */

const UNREADABLE_ERROR = 'Saved views could not be read, so nothing was changed';
const VIEW_EXISTS_ERROR = 'A view with this name already exists';
const VIEW_NOT_FOUND_ERROR = 'Saved view could not be found';

type RawEntry = Record<string, unknown>;

function readRawViews(json: string): RawEntry[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error(UNREADABLE_ERROR);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(UNREADABLE_ERROR);
  }

  return parsed as RawEntry[];
}

/** Loose match on the raw shape — the entry may not validate. */
function isSamePostsView(entry: RawEntry, view: SharedView): boolean {
  return (
    entry.route === 'posts' &&
    typeof entry.name === 'string' &&
    normalizeSharedViewName(entry.name) === normalizeSharedViewName(view.name)
  );
}

function hasNameConflict(entries: RawEntry[], name: string, excludedIndex: number): boolean {
  const normalized = normalizeSharedViewName(name);

  return entries.some(
    (entry, index) =>
      index !== excludedIndex &&
      entry.route === 'posts' &&
      typeof entry.name === 'string' &&
      normalizeSharedViewName(entry.name) === normalized,
  );
}

export function applyPostViewSave(
  json: string,
  name: string,
  params: PostListParams,
  color: PostViewColor,
  originalView?: SharedView,
): string {
  const entries = readRawViews(json);
  const nextView = buildPostView(name, params, color);

  const targetIndex = originalView
    ? entries.findIndex((entry) => isSamePostsView(entry, originalView))
    : -1;

  if (originalView && targetIndex === -1) {
    throw new Error(VIEW_NOT_FOUND_ERROR);
  }

  if (hasNameConflict(entries, nextView.name, targetIndex)) {
    throw new Error(VIEW_EXISTS_ERROR);
  }

  const updated =
    targetIndex === -1
      ? [...entries, nextView as unknown as RawEntry]
      : entries.map((entry, index) =>
          index === targetIndex ? (nextView as unknown as RawEntry) : entry,
        );

  return JSON.stringify(updated);
}

export function applyPostViewDelete(json: string, view: SharedView): string {
  const entries = readRawViews(json);
  const targetIndex = entries.findIndex((entry) => isSamePostsView(entry, view));

  if (targetIndex === -1) {
    throw new Error(VIEW_NOT_FOUND_ERROR);
  }

  return JSON.stringify(entries.filter((_, index) => index !== targetIndex));
}
