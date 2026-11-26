import { useLocation } from '@tryghost/admin-x-framework';
import { useMemo } from 'react';
import { SEGMENT_PARAM, useMemberViews } from '@/members/api';
import { type NavSavedView } from './nav-saved-views';

function getMemberViewUrl(id: string, filter: string) {
  return `members?${new URLSearchParams({ filter, [SEGMENT_PARAM]: id }).toString()}`;
}

/**
 * Whether the members screen is showing this segment: its URL names it, or, for a link with no
 * segment in it, the filter applied is the segment's own.
 */
function isMemberViewActive(pathname: string, currentSearch: string, id: string, filter: string) {
  if (pathname !== '/members') {
    return false;
  }

  const searchParams = new URLSearchParams(currentSearch);
  const shown = searchParams.get(SEGMENT_PARAM);

  return shown ? shown === id : searchParams.get('filter') === filter;
}

/** Every segment, as a shortcut under Members in the sidebar, in the site's order. */
export function useMemberSidebarViews() {
  const location = useLocation();
  const memberViews = useMemberViews();

  return useMemo<NavSavedView[]>(() => {
    return memberViews.map((view) => ({
      key: view.id,
      name: view.name,
      to: getMemberViewUrl(view.id, view.filter),
      isActive: isMemberViewActive(location.pathname, location.search, view.id, view.filter),
    }));
  }, [location.pathname, location.search, memberViews]);
}
