import {
    DEFAULT_POSTS_VIEWS,
    type PostsView,
    type PostsViewsParseResult,
    buildPostsViewsForDelete,
    buildPostsViewsForSave,
    parsePostsViewsJSON
} from '../posts-views';
import {getSettingValue, useBrowseSettings, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {isContributorUser} from '@tryghost/admin-x-framework/api/users';
import {parseAllSharedViewsJSON} from '../../members/shared-views';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {PostsResource} from '../posts-query-params';

const SHARED_VIEWS_INVALID_ERROR = 'Cannot modify saved views because shared_views is invalid';

function getSharedViewsJSON(settingsData: {settings: Array<{key: string; value: string | boolean | null}>} | undefined): string {
    return getSettingValue<string>(settingsData?.settings ?? null, 'shared_views') ?? '[]';
}

/**
 * All views for the given route: built-in default views (posts route only,
 * hidden from contributors — Ember parity) followed by the saved views from
 * the shared_views setting.
 */
export function usePostsViews(resource: PostsResource): PostsView[] {
    const {data: settingsData} = useBrowseSettings();
    const {data: currentUser} = useCurrentUser();
    const handleError = useHandleError();
    const sharedViewsJson = getSharedViewsJSON(settingsData);
    const lastReportedInvalidPayload = useRef<string | null>(null);

    const parsedViews = useMemo<PostsViewsParseResult>(() => {
        return parsePostsViewsJSON(sharedViewsJson, resource);
    }, [sharedViewsJson, resource]);

    useEffect(() => {
        if (parsedViews.ok || lastReportedInvalidPayload.current === sharedViewsJson) {
            return;
        }

        lastReportedInvalidPayload.current = sharedViewsJson;
        handleError(parsedViews.error, {withToast: false});
    }, [handleError, parsedViews, sharedViewsJson]);

    // Contributors only see their own drafts, so the default status views are
    // meaningless for them (Ember parity)
    const isContributor = !!currentUser && isContributorUser(currentUser);

    return useMemo(() => {
        const defaultViews = resource === 'posts' && !isContributor ? DEFAULT_POSTS_VIEWS : [];
        return [...defaultViews, ...(parsedViews.ok ? parsedViews.views : [])];
    }, [resource, isContributor, parsedViews]);
}

export function useSavePostsView() {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    return useCallback(async (view: {name: string; route: PostsResource; color?: string; filter: Record<string, string>}) => {
        const parsedSharedViews = parseAllSharedViewsJSON(getSharedViewsJSON(settingsData));

        if (!parsedSharedViews.ok) {
            const error = new Error(SHARED_VIEWS_INVALID_ERROR, {cause: parsedSharedViews.error});
            handleError(error, {withToast: false});
            throw error;
        }

        const updatedViews = buildPostsViewsForSave(parsedSharedViews.views, view);

        try {
            await editSettings([{
                key: 'shared_views',
                value: JSON.stringify(updatedViews)
            }]);
        } catch (error) {
            handleError(error, {withToast: false});
            throw error;
        }
    }, [settingsData, editSettings, handleError]);
}

export function useDeletePostsView() {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    return useCallback(async (view: PostsView) => {
        const parsedSharedViews = parseAllSharedViewsJSON(getSharedViewsJSON(settingsData));

        if (!parsedSharedViews.ok) {
            const error = new Error(SHARED_VIEWS_INVALID_ERROR, {cause: parsedSharedViews.error});
            handleError(error, {withToast: false});
            throw error;
        }

        const updatedViews = buildPostsViewsForDelete(parsedSharedViews.views, view);

        try {
            await editSettings([{
                key: 'shared_views',
                value: JSON.stringify(updatedViews)
            }]);
        } catch (error) {
            handleError(error, {withToast: false});
            throw error;
        }
    }, [settingsData, editSettings, handleError]);
}
