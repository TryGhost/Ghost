import { type MemberView } from '@/members/hooks/use-member-views';
import {
  type SharedView,
  hasSharedViewNameConflict,
  parseAllSharedViewsJSON,
  sharedViewSchema,
} from '@/members/shared-views';
import {
  type SettingsResponseType,
  getSettingValue,
  useBrowseSettings,
  useEditSettings,
} from '@tryghost/admin-x-framework/api/settings';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useHandleError } from '@tryghost/admin-x-framework/hooks';
import { z } from 'zod';

/**
 * Member views read and written through the `shared_views` setting, which stores them in the
 * same array as the posts views.
 *
 * Admin can be deployed ahead of Ghost, so a server from before the segments API still needs
 * member views to work through this setting. Delete this module, and the `settings` source in
 * `use-member-views.ts` that selects it, once every server Admin supports has the segments API.
 */

// The filter record may hold other nullable keys beside the required, non-empty `filter`.
const memberViewSchema = sharedViewSchema.extend({
  route: z.literal('members'),
  filter: z.intersection(
    z.record(z.string(), z.string().nullable()),
    z.object({ filter: z.string().min(1) }),
  ),
});

/** A member view as the `shared_views` setting stores it. */
export type StoredMemberView = z.infer<typeof memberViewSchema>;

export type SharedViewsParseResult =
  | { ok: true; views: StoredMemberView[] }
  | { ok: false; error: Error };

const SHARED_VIEWS_INVALID_ERROR = 'Cannot modify saved views because shared_views is invalid';
const VIEW_EXISTS_ERROR = 'A view with this name already exists';
const VIEW_UPDATE_NOT_FOUND_ERROR = 'Saved view could not be found for update';
const VIEW_UPDATE_AMBIGUOUS_ERROR = 'Multiple saved views matched update target';
const VIEW_DELETE_NOT_FOUND_ERROR = 'Saved view could not be found for delete';
const VIEW_DELETE_AMBIGUOUS_ERROR = 'Multiple saved views matched delete target';

function isStoredMemberView(view: SharedView): view is StoredMemberView {
  return memberViewSchema.safeParse(view).success;
}

export function parseSharedViewsJSON(json: string): SharedViewsParseResult {
  const parsed = parseAllSharedViewsJSON(json);

  if (!parsed.ok) {
    return parsed;
  }

  return {
    ok: true,
    views: parsed.views.filter(isStoredMemberView),
  };
}

/** The positions of the stored member views with `filter`, which is what identifies a view. */
function findMemberViewIndexes(allViews: SharedView[], filter: string): number[] {
  return allViews.flatMap((view, index) =>
    isStoredMemberView(view) && view.filter.filter === filter ? [index] : [],
  );
}

function buildMemberView(name: string, filter: string): StoredMemberView {
  return {
    name: name.trim(),
    route: 'members',
    filter: { filter },
  };
}

/** The stored views with a new member view added, or the view with `originalFilter` renamed. */
export function buildViewsForSave(
  allViews: SharedView[],
  name: string,
  filter: string,
  originalFilter?: string,
): SharedView[] {
  const nextView = buildMemberView(name, filter);

  if (originalFilter !== undefined) {
    const matchingIndexes = findMemberViewIndexes(allViews, originalFilter);

    if (matchingIndexes.length === 0) {
      throw new Error(VIEW_UPDATE_NOT_FOUND_ERROR);
    }

    if (matchingIndexes.length > 1) {
      throw new Error(VIEW_UPDATE_AMBIGUOUS_ERROR);
    }

    const targetIndex = matchingIndexes[0];
    if (hasSharedViewNameConflict(allViews, nextView, targetIndex)) {
      throw new Error(VIEW_EXISTS_ERROR);
    }

    return allViews.map((view, index) => {
      return index === targetIndex ? nextView : view;
    });
  }

  if (hasSharedViewNameConflict(allViews, nextView)) {
    throw new Error(VIEW_EXISTS_ERROR);
  }

  return [...allViews, nextView];
}

/** The stored views without the member view with `filter`. */
export function buildViewsForDelete(allViews: SharedView[], filter: string): SharedView[] {
  const matchingIndexes = findMemberViewIndexes(allViews, filter);

  if (matchingIndexes.length === 0) {
    throw new Error(VIEW_DELETE_NOT_FOUND_ERROR);
  }

  if (matchingIndexes.length > 1) {
    throw new Error(VIEW_DELETE_AMBIGUOUS_ERROR);
  }

  const targetIndex = matchingIndexes[0];
  return allViews.filter((_, index) => index !== targetIndex);
}

function getSharedViewsJSON(settingsData: SettingsResponseType | undefined): string {
  return getSettingValue<string>(settingsData?.settings ?? null, 'shared_views') ?? '[]';
}

/**
 * The member views in the cached settings. An unreadable setting is reported once per value, and
 * only while `reportInvalid` is true.
 */
export function useMemberViewsFromSettings(reportInvalid: boolean): MemberView[] {
  const { data: settingsData } = useBrowseSettings();
  const handleError = useHandleError();
  const sharedViewsJson = getSharedViewsJSON(settingsData);
  const lastReportedInvalidPayload = useRef<string | null>(null);

  const parsedMemberViews = useMemo<SharedViewsParseResult>(() => {
    return parseSharedViewsJSON(sharedViewsJson);
  }, [sharedViewsJson]);

  useEffect(() => {
    if (
      !reportInvalid ||
      parsedMemberViews.ok ||
      lastReportedInvalidPayload.current === sharedViewsJson
    ) {
      return;
    }

    lastReportedInvalidPayload.current = sharedViewsJson;
    handleError(parsedMemberViews.error, { withToast: false });
  }, [handleError, parsedMemberViews, reportInvalid, sharedViewsJson]);

  return useMemo(() => {
    if (!parsedMemberViews.ok) {
      return [];
    }

    return parsedMemberViews.views.map((view) => ({ name: view.name, filter: view.filter.filter }));
  }, [parsedMemberViews]);
}

export function useSaveMemberViewToSettings() {
  const { data: settingsData } = useBrowseSettings();
  const { mutateAsync: editSettings } = useEditSettings();
  const handleError = useHandleError();

  return useCallback(
    async (name: string, filter: string, originalView?: MemberView) => {
      const parsedSharedViews = parseAllSharedViewsJSON(getSharedViewsJSON(settingsData));

      if (!parsedSharedViews.ok) {
        const error = new Error(SHARED_VIEWS_INVALID_ERROR, { cause: parsedSharedViews.error });
        handleError(error, { withToast: false });
        throw error;
      }

      const updatedViews = buildViewsForSave(
        parsedSharedViews.views,
        name,
        filter,
        originalView?.filter,
      );

      try {
        await editSettings([
          {
            key: 'shared_views',
            value: JSON.stringify(updatedViews),
          },
        ]);
      } catch (error) {
        handleError(error, { withToast: false });
        throw error;
      }
    },
    [settingsData, editSettings, handleError],
  );
}

export function useDeleteMemberViewFromSettings() {
  const { data: settingsData } = useBrowseSettings();
  const { mutateAsync: editSettings } = useEditSettings();
  const handleError = useHandleError();

  return useCallback(
    async (view: MemberView) => {
      const parsedSharedViews = parseAllSharedViewsJSON(getSharedViewsJSON(settingsData));

      if (!parsedSharedViews.ok) {
        const error = new Error(SHARED_VIEWS_INVALID_ERROR, { cause: parsedSharedViews.error });
        handleError(error, { withToast: false });
        throw error;
      }

      const updatedViews = buildViewsForDelete(parsedSharedViews.views, view.filter);

      try {
        await editSettings([
          {
            key: 'shared_views',
            value: JSON.stringify(updatedViews),
          },
        ]);
      } catch (error) {
        handleError(error, { withToast: false });
        throw error;
      }
    },
    [settingsData, editSettings, handleError],
  );
}
