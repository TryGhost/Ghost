import {
    buildViewsForDelete,
    buildViewsForSave,
    filtersToRecord,
    isFilterEqual,
    parseSharedViewsJSON
} from '../domain/member-views';
import {getSettingValue, useBrowseSettings, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {Filter} from '@tryghost/shade';
import type {MemberView} from '../domain/member-views';

export {
    buildViewsForDelete,
    buildViewsForSave,
    filterRecordToSearchParams,
    filtersToRecord,
    isFilterEqual,
    isViewSearchActive,
    parseSharedViewsJSON
} from '../domain/member-views';
export type {MemberView, SharedViewsParseResult} from '../domain/member-views';

const SHARED_VIEWS_INVALID_ERROR = 'Cannot modify saved views because shared_views is invalid';

function getSharedViewsJSON(settingsData: {settings: Array<{key: string; value: string | boolean | null}>} | undefined): string {
    return getSettingValue<string>(settingsData?.settings ?? null, 'shared_views') ?? '[]';
}

/**
 * Generic hook to read shared views for any route from the shared_views setting
 */
export function useSharedViews(route: string): MemberView[] {
    const {data: settingsData} = useBrowseSettings();
    const handleError = useHandleError();
    const sharedViewsJson = getSharedViewsJSON(settingsData);
    const lastReportedInvalidPayload = useRef<string | null>(null);

    const parsedSharedViews = useMemo(() => parseSharedViewsJSON(sharedViewsJson), [sharedViewsJson]);

    useEffect(() => {
        if (parsedSharedViews.ok || lastReportedInvalidPayload.current === sharedViewsJson) {
            return;
        }

        lastReportedInvalidPayload.current = sharedViewsJson;
        handleError(parsedSharedViews.error, {withToast: false});
    }, [handleError, parsedSharedViews, sharedViewsJson]);

    return useMemo(() => {
        if (!parsedSharedViews.ok) {
            return [];
        }

        return parsedSharedViews.views.filter(v => v.route === route);
    }, [parsedSharedViews, route]);
}

/**
 * Hook to read member views from the shared_views setting
 */
export function useMemberViews() {
    return useSharedViews('members');
}

/**
 * Hook to save a new member view
 */
export function useSaveMemberView() {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    const save = useCallback(async (name: string, filters: Filter[], originalView?: MemberView) => {
        const parsedSharedViews = parseSharedViewsJSON(getSharedViewsJSON(settingsData));

        if (!parsedSharedViews.ok) {
            const error = new Error(SHARED_VIEWS_INVALID_ERROR, {cause: parsedSharedViews.error});
            handleError(error, {withToast: false});
            throw error;
        }

        const updatedViews = buildViewsForSave(parsedSharedViews.views, name, filters, originalView);

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

    return save;
}

/**
 * Hook to delete a member view
 */
export function useDeleteMemberView() {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    const deleteView = useCallback(async (view: MemberView) => {
        const parsedSharedViews = parseSharedViewsJSON(getSharedViewsJSON(settingsData));

        if (!parsedSharedViews.ok) {
            const error = new Error(SHARED_VIEWS_INVALID_ERROR, {cause: parsedSharedViews.error});
            handleError(error, {withToast: false});
            throw error;
        }

        const updatedViews = buildViewsForDelete(parsedSharedViews.views, view);

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

    return deleteView;
}

/**
 * Find the active member view based on current filters
 */
export function useActiveMemberView(views: MemberView[], filters: Filter[]): MemberView | null {
    return useMemo(() => {
        if (filters.length === 0 || views.length === 0) {
            return null;
        }

        const currentFilter = filtersToRecord(filters);
        return views.find(v => isFilterEqual(v.filter, currentFilter)) ?? null;
    }, [views, filters]);
}
