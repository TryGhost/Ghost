import { type Segment, useBrowseSegments } from '@tryghost/admin-x-framework/api/segments';
import { canManageMembers, hasAdminAccess } from '@tryghost/admin-x-framework/api/users';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useEffect, useMemo } from 'react';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { useSimulateNoSegments } from '@/members/segments/poc-store';

/**
 * Saved member views, for the members screen and the sidebar. A saved member view is a segment:
 * a named member filter that Admin lists, adds, renames and deletes through the segments API.
 */

const NO_VIEWS: Segment[] = [];

/**
 * The saved member views in display order, for staff who are shown them. There are none until
 * the segments list has loaded, and none when it can't be read. A failed list is reported
 * without a toast, because the sidebar asks for it on every screen, and it is requested again
 * the next time the members screen is opened.
 */
export function useMemberViews(): Segment[] {
  const { data: currentUser } = useCurrentUser();
  const { data, error } = useBrowseSegments({
    defaultErrorHandler: false,
    enabled: Boolean(currentUser && canManageMembers(currentUser)),
  });
  const handleError = useHandleError();

  useEffect(() => {
    if (error) {
      handleError(error, { withToast: false });
    }
  }, [error, handleError]);

  // POC (poc/segments-ui): the prototype's switch that shows the site with no segments.
  const { simulateNoSegments } = useSimulateNoSegments();

  return simulateNoSegments ? NO_VIEWS : (data?.segments ?? NO_VIEWS);
}

/**
 * Whether the signed-in staff user can save, rename and delete member views. Owners and
 * Administrators can. A Super Editor is shown the views and can open them, but the server
 * rejects a change to one, so the controls that change views are not offered.
 */
export function useCanChangeMemberViews(): boolean {
  const { data: currentUser } = useCurrentUser();
  return Boolean(currentUser && hasAdminAccess(currentUser));
}

/**
 * The longest view name, in characters, that can be saved. It mirrors the segments API's limit,
 * which rejects a longer name with an error the popover can only show as a generic failure.
 */
export const MEMBER_VIEW_NAME_MAX_LENGTH = 191;

/** The saved view whose filter is the one applied, if there is one. */
export function useActiveMemberView(views: Segment[], nql: string | undefined): Segment | null {
  return useMemo(() => {
    if (!nql || views.length === 0) {
      return null;
    }

    return views.find((view) => view.filter === nql) ?? null;
  }, [views, nql]);
}
