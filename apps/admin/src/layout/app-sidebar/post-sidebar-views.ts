import { POST_VIEW_PARAMS, type PostResource } from '@/posts/api';

/**
 * Sidebar saved views for posts and pages, resolved from the router location
 * like `member-sidebar-views.ts`.
 */

export type PostViewFilter = Record<string, string | null>;

export interface PostDefaultView {
  name: string;
  filter: PostViewFilter;
}

/** Posts only — there are no default views for pages. */
export const POST_DEFAULT_VIEWS: PostDefaultView[] = [
  { name: 'Drafts', filter: { type: 'draft' } },
  { name: 'Scheduled', filter: { type: 'scheduled' } },
  { name: 'Published', filter: { type: 'published' } },
];

export function getDefaultPostViews(isContributor: boolean): PostDefaultView[] {
  // Contributors only ever see their own drafts, so status views say nothing.
  return isContributor ? [] : POST_DEFAULT_VIEWS;
}

/** Params are emitted in a fixed order so one view always yields one URL. */
export function buildPostViewUrl(route: PostResource, filter: PostViewFilter): string {
  const params = new URLSearchParams();

  POST_VIEW_PARAMS.forEach((param) => {
    const value = filter[param];

    if (value !== null && value !== undefined && value !== '') {
      params.set(param, value);
    }
  });

  const query = params.toString();

  return query ? `${route}?${query}` : route;
}

export interface ViewLocation {
  pathname: string;
  search: string;
}

/**
 * A view is active only when *every* one of the five params agrees, matching
 * Ember's `activeView` (which compares the whole cleaned filter). So a view of
 * `{type: 'draft'}` is not active on `?type=draft&tag=news` — that is a
 * different view, or none.
 *
 * Params outside the five are ignored; they aren't part of a view's identity.
 */
export function isPostViewActive(
  location: ViewLocation,
  route: PostResource,
  filter: PostViewFilter,
): boolean {
  if (location.pathname !== `/${route}`) {
    return false;
  }

  const current = new URLSearchParams(location.search);

  return POST_VIEW_PARAMS.every((param) => {
    const expected = filter[param] ?? null;
    const actual = current.get(param);

    return expected === (actual === '' ? null : actual);
  });
}
