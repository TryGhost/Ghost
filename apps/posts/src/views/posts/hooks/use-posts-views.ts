import {
    DEFAULT_POSTS_VIEWS,
    type PostsView,
    type PostsViewsParseResult,
    buildPostsViewsForDelete,
    buildPostsViewsForSave,
    parsePostsViewsJSON
} from '../posts-views';
import {getSharedViewsJSON, useMutateSharedViews} from '../../shared/use-mutate-shared-views';
import {isContributorUser} from '@tryghost/admin-x-framework/api/users';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {PostsResource} from '../posts-query-params';

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
    const mutateSharedViews = useMutateSharedViews();

    return useCallback(async (view: {name: string; route: PostsResource; color?: string; filter: Record<string, string>}) => {
        await mutateSharedViews(allViews => buildPostsViewsForSave(allViews, view));
    }, [mutateSharedViews]);
}

export function useDeletePostsView() {
    const mutateSharedViews = useMutateSharedViews();

    return useCallback(async (view: PostsView) => {
        await mutateSharedViews(allViews => buildPostsViewsForDelete(allViews, view));
    }, [mutateSharedViews]);
}
