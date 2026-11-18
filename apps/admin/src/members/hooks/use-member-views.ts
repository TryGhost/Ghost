import {
  type Segment,
  type SegmentsResponseType,
  useBrowseSegments,
} from '@tryghost/admin-x-framework/api/segments';
import { APIError } from '@tryghost/admin-x-framework/errors';
import { canManageMembers } from '@tryghost/admin-x-framework/api/users';
import { useCurrentUser } from '@tryghost/admin-x-framework/api/current-user';
import { useEffect, useMemo } from 'react';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import {
  useDeleteMemberViewFromSettings,
  useMemberViewsFromSettings,
  useSaveMemberViewToSettings,
} from '@/members/member-views-from-settings';

/**
 * Saved member views, for the members screen and the sidebar. Callers list, save, rename and
 * delete views through these hooks without knowing where Ghost stores them.
 */

/** A saved member view: a named member filter. The filter identifies the view. */
export interface MemberView {
  name: string;
  filter: string;
}

/** Whether a segments request failed because the server is older than the segments API. */
function isSegmentsApiMissing(error: unknown): boolean {
  return error instanceof APIError && error.response?.status === 404;
}

/**
 * Where the server keeps member views, as the segments list tells it:
 *
 * - `segments`: the list loaded, so views are read through the segments API.
 * - `settings`: the list answered 404. Admin can be deployed ahead of Ghost, so this is a server
 *   older than the segments API, and views are read through the settings.
 * - `unknown`: the list hasn't loaded, or it failed for another reason.
 *
 * Every read of member views takes this decision from `memberViewsSource`, so
 * `settings` is the one thing to remove, with `member-views-from-settings.ts`, once every server
 * Admin supports has the segments API.
 */
type MemberViewsSource =
  | { api: 'segments'; segments: Segment[] }
  | { api: 'settings' }
  | { api: 'unknown'; error: unknown };

/**
 * The source the segments list's latest answer points to. A 404 decides even when a list loaded
 * earlier in the session is still cached, since a server can be rolled back to a version without
 * the segments API.
 */
function memberViewsSource(list: {
  data: SegmentsResponseType | undefined;
  error: unknown;
}): MemberViewsSource {
  if (isSegmentsApiMissing(list.error)) {
    return { api: 'settings' };
  }
  if (list.data) {
    return { api: 'segments', segments: list.data.segments };
  }
  return { api: 'unknown', error: list.error };
}

/**
 * The segments list, requested only for staff who are shown member views. Once the server answers
 * 404 the query is disabled, so a server older than the segments API gets one failed request, not
 * one each time the sidebar or the members screen mounts. Any other failure isn't retried on
 * mount either: the sidebar and the members screen each mount this query, so a failing list
 * would otherwise be requested, and its failure reported, on every visit.
 */
function useSegmentsQuery() {
  const { data: currentUser } = useCurrentUser();
  const showsMemberViews = Boolean(currentUser && canManageMembers(currentUser));

  return useBrowseSegments({
    defaultErrorHandler: false,
    retryOnMount: false,
    enabled: (query) => showsMemberViews && !isSegmentsApiMissing(query.state.error),
  });
}

/**
 * The saved member views in display order. They come from the segments API once its list has
 * loaded. Until then, and when it can't be read, they come from the cached settings, which Ghost
 * stores them in, so they show as soon as the settings load. On a server without the segments
 * API they always come from the settings, which is also where views are then written.
 */
export function useMemberViews(): MemberView[] {
  const { data, error } = useSegmentsQuery();
  const handleError = useHandleError();
  const source = memberViewsSource({ data, error });
  const storedInSettings = source.api === 'settings';
  const settingsViews = useMemberViewsFromSettings(storedInSettings);

  useEffect(() => {
    if (error && !storedInSettings) {
      handleError(error, { withToast: false });
    }
  }, [error, handleError, storedInSettings]);

  return source.api === 'segments' ? source.segments : settingsViews;
}

export {
  useDeleteMemberViewFromSettings as useDeleteMemberView,
  useSaveMemberViewToSettings as useSaveMemberView,
};

export function useActiveMemberView(
  views: MemberView[],
  nql: string | undefined,
): MemberView | null {
  return useMemo(() => {
    if (!nql || views.length === 0) {
      return null;
    }

    return views.find((view) => view.filter === nql) ?? null;
  }, [views, nql]);
}
