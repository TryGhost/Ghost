import { POST_VIEW_PARAMS } from '@/posts/list/post-view-params';
import {
  type SharedView,
  findMatchingSharedViewIndexes,
  hasSharedViewNameConflict,
} from '@/members/api';
import type { PostListParams } from '@/posts/list/post-query-params';
import type { PostResource } from '@/posts/list/post-resource';

/**
 * Saved views for the posts list.
 *
 * Records are written in exactly Ember's shape — `{name, route, color,
 * filter}` where `filter` is the five URL params — so a view saved here shows
 * up correctly in the Ember sidebar and vice versa while both exist.
 *
 * The generic save/delete plumbing is shared with members via
 * `@/members/api`; only the filter shape differs.
 */

/** Ember picks one of these at random for a new view. */
export const POST_VIEW_COLORS = [
  'midgrey',
  'blue',
  'green',
  'red',
  'teal',
  'purple',
  'yellow',
  'orange',
  'pink',
] as const;

export type PostViewColor = (typeof POST_VIEW_COLORS)[number];

const VIEW_EXISTS_ERROR = 'A view with this name already exists';
const VIEW_UPDATE_NOT_FOUND_ERROR = 'Saved view could not be found for update';
const VIEW_DELETE_NOT_FOUND_ERROR = 'Saved view could not be found for delete';

export function pickPostViewColor(): PostViewColor {
  return POST_VIEW_COLORS[Math.floor(Math.random() * POST_VIEW_COLORS.length)];
}

/** Only the five params, blanks dropped — so it compares equal to a clean URL. */
function toViewFilter(params: PostListParams): Record<string, string> {
  const filter: Record<string, string> = {};

  POST_VIEW_PARAMS.forEach((param) => {
    const value = params[param];

    if (value !== null && value !== undefined && value !== '') {
      filter[param] = value;
    }
  });

  return filter;
}

export function buildPostView(
  name: string,
  params: PostListParams,
  color: PostViewColor,
): SharedView {
  return {
    name: name.trim(),
    route: 'posts',
    color,
    filter: toViewFilter(params),
  };
}

export interface CanSavePostViewOptions {
  isAdmin: boolean;
  resource: PostResource;
  params: PostListParams;
  /** Default views (Drafts/Scheduled/Published) can't be edited or re-saved. */
  isDefaultView: boolean;
}

/**
 * Ember's `showCustomViewManagement`: admin, on the posts screen, not on a
 * default view, and something actually filtered. Note that a sort alone counts
 * here, unlike the empty state's "showing all" check.
 */
export function canSavePostView({
  isAdmin,
  resource,
  params,
  isDefaultView,
}: CanSavePostViewOptions): boolean {
  if (!isAdmin || resource !== 'posts' || isDefaultView) {
    return false;
  }

  return POST_VIEW_PARAMS.some((param) => Boolean(params[param]));
}

export function buildPostViewsForSave(
  allViews: SharedView[],
  name: string,
  params: PostListParams,
  color: PostViewColor,
  originalView?: SharedView,
): SharedView[] {
  const nextView = buildPostView(name, params, color);

  if (originalView) {
    const [targetIndex] = findMatchingSharedViewIndexes(allViews, originalView);

    if (targetIndex === undefined) {
      throw new Error(VIEW_UPDATE_NOT_FOUND_ERROR);
    }

    if (hasSharedViewNameConflict(allViews, nextView, targetIndex)) {
      throw new Error(VIEW_EXISTS_ERROR);
    }

    return allViews.map((view, index) => (index === targetIndex ? nextView : view));
  }

  if (hasSharedViewNameConflict(allViews, nextView)) {
    throw new Error(VIEW_EXISTS_ERROR);
  }

  return [...allViews, nextView];
}

export function buildPostViewsForDelete(allViews: SharedView[], view: SharedView): SharedView[] {
  const [targetIndex] = findMatchingSharedViewIndexes(allViews, view);

  if (targetIndex === undefined) {
    throw new Error(VIEW_DELETE_NOT_FOUND_ERROR);
  }

  return allViews.filter((_, index) => index !== targetIndex);
}

/** The saved view matching the current params exactly, if any. */
export function findActivePostView(
  views: SharedView[],
  params: PostListParams,
): SharedView | undefined {
  const current = toViewFilter(params);

  return views.find((view) =>
    POST_VIEW_PARAMS.every((param) => (view.filter[param] ?? null) === (current[param] ?? null)),
  );
}
