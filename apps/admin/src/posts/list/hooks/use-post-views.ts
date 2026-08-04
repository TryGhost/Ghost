import {buildPostViewsForDelete, buildPostViewsForSave, type PostViewColor} from '@/posts/list/post-views';
import {getSettingValue, useBrowseSettings, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {parseAllSharedViewsJSON, type SharedView} from '@/members/shared-views';
import {useCallback} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {PostListParams} from '@/posts/list/post-query-params';

/**
 * Reading and writing saved views for the posts list.
 *
 * Views for every screen share one `shared_views` setting, so a save has to
 * round-trip the *whole* list — dropping the members' or pages' entries would
 * delete them.
 */

const SHARED_VIEWS_INVALID_ERROR = 'Saved views could not be read';

type SettingsData = {settings: Array<{key: string; value: string | boolean | null}>} | undefined;

function getSharedViewsJSON(settingsData: SettingsData): string {
    return getSettingValue<string>(settingsData?.settings ?? null, 'shared_views') ?? '[]';
}

/** Just the posts views, for the filter bar's edit/save affordance. */
export function usePostViews(): SharedView[] {
    const {data: settingsData} = useBrowseSettings();
    const parsed = parseAllSharedViewsJSON(getSharedViewsJSON(settingsData));

    return parsed.ok ? parsed.views.filter(view => view.route === 'posts') : [];
}

export function useSavePostView() {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    return useCallback(async (
        name: string,
        params: PostListParams,
        color: PostViewColor,
        originalView?: SharedView
    ) => {
        const parsed = parseAllSharedViewsJSON(getSharedViewsJSON(settingsData));

        if (!parsed.ok) {
            const error = new Error(SHARED_VIEWS_INVALID_ERROR, {cause: parsed.error});
            handleError(error, {withToast: false});
            throw error;
        }

        const updatedViews = buildPostViewsForSave(parsed.views, name, params, color, originalView);

        try {
            await editSettings([{key: 'shared_views', value: JSON.stringify(updatedViews)}]);
        } catch (error) {
            handleError(error, {withToast: false});
            throw error;
        }
    }, [settingsData, editSettings, handleError]);
}

export function useDeletePostView() {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    return useCallback(async (view: SharedView) => {
        const parsed = parseAllSharedViewsJSON(getSharedViewsJSON(settingsData));

        if (!parsed.ok) {
            const error = new Error(SHARED_VIEWS_INVALID_ERROR, {cause: parsed.error});
            handleError(error, {withToast: false});
            throw error;
        }

        const updatedViews = buildPostViewsForDelete(parsed.views, view);

        try {
            await editSettings([{key: 'shared_views', value: JSON.stringify(updatedViews)}]);
        } catch (error) {
            handleError(error, {withToast: false});
            throw error;
        }
    }, [settingsData, editSettings, handleError]);
}
