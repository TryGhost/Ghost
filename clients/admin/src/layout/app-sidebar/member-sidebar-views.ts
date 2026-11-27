import { useLocation } from '@tryghost/admin-x-framework';
import { useMemo } from 'react';
import { useMemberViews } from '@/members/api';
import { type NavSavedView } from './nav-saved-views';

function getMemberViewUrl(filter: string) {
  return `members?${new URLSearchParams({ filter }).toString()}`;
}

function isMemberViewActive(pathname: string, currentSearch: string, filter: string) {
  if (pathname !== '/members') {
    return false;
  }

  return new URLSearchParams(currentSearch).get('filter') === filter;
}

export function useMemberSidebarViews() {
  const location = useLocation();
  const memberViews = useMemberViews();

  return useMemo<NavSavedView[]>(() => {
    return memberViews.map((view) => ({
      key: `${view.name}:${view.filter}`,
      name: view.name,
      to: getMemberViewUrl(view.filter),
      isActive: isMemberViewActive(location.pathname, location.search, view.filter),
    }));
  }, [location.pathname, location.search, memberViews]);
}
