import {applyPostViewDelete, applyPostViewSave} from '@/posts/list/post-views-storage';
import {getSettingValue, useBrowseSettings, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {parseAllSharedViewsJSON, type SharedView} from '@/members/shared-views';
import {useCallback} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {PostListParams} from '@/posts/list/post-query-params';
import type {PostViewColor} from '@/posts/list/post-views';

/**
 * Reading and writing saved views for the posts list.
 *
 * Reads go through the tolerant parser (unreadable entries are simply not
 * shown); writes go through `post-views-storage`, which works on the raw array
 * so it can never drop an entry it didn't understand. See that file for why.
 */

const SETTINGS_NOT_LOADED_ERROR = 'Settings are still loading, so nothing was changed';

type SettingsData = {settings: Array<{key: string; value: string | boolean | null}>} | undefined;

/**
 * Returns `undefined` — not `'[]'` — while settings are still loading. An
 * empty-list default here would let a save replace every existing view with
 * just the new one.
 */
function getSharedViewsJSON(settingsData: SettingsData): string | undefined {
    if (!settingsData) {
        return undefined;
    }

    return getSettingValue<string>(settingsData.settings, 'shared_views') ?? '[]';
}

/** Just the posts views, for the filter bar's edit/save affordance. */
export function usePostViews(): SharedView[] {
    const {data: settingsData} = useBrowseSettings();
    const json = getSharedViewsJSON(settingsData);

    if (json === undefined) {
        return [];
    }

    const parsed = parseAllSharedViewsJSON(json);

    return parsed.ok ? parsed.views.filter(view => view.route === 'posts') : [];
}

function useWriteSharedViews() {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    return useCallback(async (transform: (json: string) => string) => {
        const json = getSharedViewsJSON(settingsData);

        if (json === undefined) {
            const error = new Error(SETTINGS_NOT_LOADED_ERROR);
            handleError(error, {withToast: false});
            throw error;
        }

        // Throws rather than writing if the stored value is unreadable.
        const updated = transform(json);

        try {
            await editSettings([{key: 'shared_views', value: updated}]);
        } catch (error) {
            handleError(error, {withToast: false});
            throw error;
        }
    }, [settingsData, editSettings, handleError]);
}

export function useSavePostView() {
    const writeSharedViews = useWriteSharedViews();

    return useCallback(async (
        name: string,
        params: PostListParams,
        color: PostViewColor,
        originalView?: SharedView
    ) => {
        await writeSharedViews(json => applyPostViewSave(json, name, params, color, originalView));
    }, [writeSharedViews]);
}

export function useDeletePostView() {
    const writeSharedViews = useWriteSharedViews();

    return useCallback(async (view: SharedView) => {
        await writeSharedViews(json => applyPostViewDelete(json, view));
    }, [writeSharedViews]);
}
