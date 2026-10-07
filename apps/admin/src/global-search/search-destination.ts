import { BILLING_SEARCH_GROUP_KEY, type SearchResult } from './searchables';

const BILLING_ROUTE_ROOT = '/pro';

export interface SearchDestination {
  path: string;
  /** Set for billing results: the billing app route the path shows. */
  billingSubRoute?: string;
}

/** Where selecting a search result goes, keyed on its model rather than its group's display name. */
export function getSearchDestination(result: SearchResult): SearchDestination | null {
  if (result.groupKey === BILLING_SEARCH_GROUP_KEY) {
    const subRoute = result.path ?? '/';
    return {
      path: subRoute === '/' ? BILLING_ROUTE_ROOT : `${BILLING_ROUTE_ROOT}${subRoute}`,
      billingSubRoute: subRoute,
    };
  }

  const separator = result.id.indexOf('.');
  const model = result.id.slice(0, separator);
  const key = encodeURIComponent(result.id.slice(separator + 1));

  switch (model) {
    case 'post':
      return { path: `/editor/post/${key}` };
    case 'page':
      return { path: `/editor/page/${key}` };
    case 'user':
      return { path: `/settings/staff/${key}` };
    case 'tag':
      return { path: `/tags/${key}` };
    default:
      return null;
  }
}
