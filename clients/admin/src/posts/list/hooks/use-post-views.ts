import { applyPostViewDelete, applyPostViewSave } from '@/posts/list/post-views-storage';
import {
  getSettingValue,
  useBrowseSettings,
  useEditSettings,
} from '@tryghost/admin-x-framework/api/settings';
import { apiUrl } from '@tryghost/admin-x-framework/helpers';
import { parseAllSharedViewsJSON, type SharedView } from '@/members/api';
import { useCallback } from 'react';
import { useFetchApi, useHandleError } from '@tryghost/admin-x-framework/hooks';
import { z } from 'zod';
import type { PostListParams } from '@/posts/list/post-query-params';
import type { PostViewColor } from '@/posts/list/post-views';

/**
 * Reading and writing saved views for the posts list.
 *
 * Reads go through the tolerant parser (unreadable entries are simply not
 * shown); writes go through `post-views-storage`, which works on the raw array
 * so it can never drop an entry it didn't understand. See that file for why.
 */

/** Just the posts views, for the filter bar's edit/save affordance. */
export function usePostViews(): SharedView[] {
  const { data: settingsData } = useBrowseSettings();

  if (!settingsData) {
    return [];
  }

  const json = getSettingValue<string>(settingsData.settings, 'shared_views') ?? '[]';
  const parsed = parseAllSharedViewsJSON(json);

  return parsed.ok ? parsed.views.filter((view) => view.route === 'posts') : [];
}

const ViewsSettingsSchema = z.object({
  settings: z.array(z.object({ key: z.string(), value: z.unknown() })),
});

/**
 * The stored `shared_views` value, read from the server rather than the cached
 * settings. Other writers change the setting too (member views, another tab),
 * so a cached copy can be out of date, and a save built from it would put
 * their old views back. A direct read leaves the cache alone, so the screen
 * doesn't change mid-save.
 */
function useFetchSharedViews() {
  const fetchApi = useFetchApi();

  return useCallback(async (): Promise<string> => {
    const data = ViewsSettingsSchema.parse(
      await fetchApi<unknown>(apiUrl('/settings/', { group: 'views' })),
    );
    const value = data.settings.find(({ key }) => key === 'shared_views')?.value;
    // An empty value is no views, as it is for the cached settings.
    return typeof value === 'string' && value !== '' ? value : '[]';
  }, [fetchApi]);
}

function useWriteSharedViews() {
  const fetchSharedViews = useFetchSharedViews();
  const { mutateAsync: editSettings } = useEditSettings();
  const handleError = useHandleError();

  return useCallback(
    async (transform: (json: string) => string) => {
      let json: string;

      try {
        json = await fetchSharedViews();
      } catch (error) {
        handleError(error, { withToast: false });
        throw error;
      }

      // Throws rather than writing if the stored value is unreadable.
      const updated = transform(json);

      try {
        await editSettings([{ key: 'shared_views', value: updated }]);
      } catch (error) {
        handleError(error, { withToast: false });
        throw error;
      }
    },
    [fetchSharedViews, editSettings, handleError],
  );
}

export function useSavePostView() {
  const writeSharedViews = useWriteSharedViews();

  return useCallback(
    async (
      name: string,
      params: PostListParams,
      color: PostViewColor,
      originalView?: SharedView,
    ) => {
      await writeSharedViews((json) => applyPostViewSave(json, name, params, color, originalView));
    },
    [writeSharedViews],
  );
}

export function useDeletePostView() {
  const writeSharedViews = useWriteSharedViews();

  return useCallback(
    async (view: SharedView) => {
      await writeSharedViews((json) => applyPostViewDelete(json, view));
    },
    [writeSharedViews],
  );
}
