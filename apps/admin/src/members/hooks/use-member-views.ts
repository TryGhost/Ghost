import { useMemo } from 'react';
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

/** The saved member views in display order. */
export function useMemberViews(): MemberView[] {
  return useMemberViewsFromSettings();
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
