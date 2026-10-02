import { POST_VIEW_PARAMS } from '@/posts/list/post-view-params';
import type { PostResource } from '@/posts/list/post-resource';

/**
 * Remember the last list's filters for editor breadcrumbs and the Pages
 * sidebar link. The Posts sidebar link always opens the full list.
 *
 * The list screen reports its params here as they change. Module scope keeps
 * them in memory and per tab.
 */

type ViewFilter = Record<string, string | null>;

const lastSeen = new Map<PostResource, string>();

/** Called by the list screen whenever its params change. */
export function rememberStickyPostFilters(resource: PostResource, search: string): void {
  const params = toViewParams(search);

  if (Object.keys(params).length === 0) {
    lastSeen.delete(resource);
    return;
  }

  lastSeen.set(resource, buildQuery(params));
}

export function clearStickyPostFilters(): void {
  lastSeen.clear();
}

/** Editor breadcrumbs return to the last list, including saved views. */
export function getPostListReturnUrl(resource: PostResource): string {
  const search = lastSeen.get(resource);
  return `/${resource}${search ? `?${search}` : ''}`;
}

/** Only the five params a view is made of; anything else isn't sticky. */
function toViewParams(search: string): Record<string, string> {
  const source = new URLSearchParams(search);
  const params: Record<string, string> = {};

  POST_VIEW_PARAMS.forEach((param) => {
    const value = source.get(param);

    if (value !== null && value !== '') {
      params[param] = value;
    }
  });

  return params;
}

function buildQuery(params: Record<string, string>): string {
  const search = new URLSearchParams();

  POST_VIEW_PARAMS.forEach((param) => {
    if (params[param] !== undefined) {
      search.set(param, params[param]);
    }
  });

  return search.toString();
}

function matchesView(params: Record<string, string>, view: ViewFilter): boolean {
  return POST_VIEW_PARAMS.every((param) => {
    const expected = view[param] ?? null;

    return expected === (params[param] ?? null);
  });
}

/**
 * Where the sidebar's top-level item should link.
 *
 * @param currentPathname so being *on* the route yields a bare URL
 * @param views the saved and default views, so remembered params that are just
 *              a view don't make "Posts" a shortcut back into that view
 */
export function getStickyPostFilterUrl(
  resource: PostResource,
  currentPathname: string,
  views: ViewFilter[],
): string {
  if (currentPathname === `/${resource}`) {
    return resource;
  }

  const remembered = lastSeen.get(resource);

  if (!remembered) {
    return resource;
  }

  const params = toViewParams(`?${remembered}`);

  if (views.some((view) => matchesView(params, view))) {
    return resource;
  }

  return `${resource}?${remembered}`;
}
