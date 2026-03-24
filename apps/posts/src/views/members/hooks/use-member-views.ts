import {
    type MemberView,
    type SharedViewsParseResult,
    buildViewsForDelete,
    buildViewsForSave,
    parseSharedViewsJSON
} from '../member-views';
import {getSettingValue, useBrowseSettings, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {parseAllSharedViewsJSON} from '../shared-views';
import {useCallback, useEffect, useMemo, useRef} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

export {
    buildViewsForDelete,
    buildViewsForSave,
    filterRecordToSearchParams,
    isMemberViewSearchActive,
    parseSharedViewsJSON
} from '../member-views';
export type {MemberView, SharedViewsParseResult} from '../member-views';

const SHARED_VIEWS_INVALID_ERROR = 'Cannot modify saved views because shared_views is invalid';

function getSharedViewsJSON(settingsData: {settings: Array<{key: string; value: string | boolean | null}>} | undefined): string {
    return getSettingValue<string>(settingsData?.settings ?? null, 'shared_views') ?? '[]';
}

export function useMemberViews(): MemberView[] {
    const {data: settingsData} = useBrowseSettings();
    const handleError = useHandleError();
    const sharedViewsJson = getSharedViewsJSON(settingsData);
    const lastReportedInvalidPayload = useRef<string | null>(null);

    const parsedMemberViews = useMemo<SharedViewsParseResult>(() => {
        return parseSharedViewsJSON(sharedViewsJson);
    }, [sharedViewsJson]);

    useEffect(() => {
        if (parsedMemberViews.ok || lastReportedInvalidPayload.current === sharedViewsJson) {
            return;
        }

        lastReportedInvalidPayload.current = sharedViewsJson;
        handleError(parsedMemberViews.error, {withToast: false});
    }, [handleError, parsedMemberViews, sharedViewsJson]);

    return parsedMemberViews.ok ? parsedMemberViews.views : [];
}

export function useSaveMemberView() {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    return useCallback(async (name: string, filter: string, originalView?: MemberView) => {
        const parsedSharedViews = parseAllSharedViewsJSON(getSharedViewsJSON(settingsData));

        if (!parsedSharedViews.ok) {
            const error = new Error(SHARED_VIEWS_INVALID_ERROR, {cause: parsedSharedViews.error});
            handleError(error, {withToast: false});
            throw error;
        }

        const updatedViews = buildViewsForSave(parsedSharedViews.views, name, filter, originalView);

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

export function useDeleteMemberView() {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    return useCallback(async (view: MemberView) => {
        const parsedSharedViews = parseAllSharedViewsJSON(getSharedViewsJSON(settingsData));

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
}

export function useActiveMemberView(views: MemberView[], nql: string | undefined): MemberView | null {
    return useMemo(() => {
        if (!nql || views.length === 0) {
            return null;
        }

        return views.find(view => view.filter.filter === nql) ?? null;
    }, [views, nql]);
}
