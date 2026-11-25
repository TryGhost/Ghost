import { useLocation } from '@tryghost/admin-x-framework';
import { useMemo } from 'react';
import { SEGMENT_PARAM, useMemberViews, useSegmentPins } from '@/members/api';
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

/**
 * The segments pinned to the sidebar, as shortcuts under Members. A segment isn't pinned until
 * someone pins it, so most sites show none.
 */
export function useMemberSidebarViews() {
  const location = useLocation();
  const memberViews = useMemberViews();
  const { isPinned } = useSegmentPins();

  return useMemo<NavSavedView[]>(() => {
    return memberViews
      .filter((view) => isPinned(view.id))
      .map((view) => ({
        key: view.id,
        name: view.name,
        to: getMemberViewUrl(view.id, view.filter),
        isActive: isMemberViewActive(location.pathname, location.search, view.id, view.filter),
      }));
  }, [location.pathname, location.search, memberViews, isPinned]);
}
