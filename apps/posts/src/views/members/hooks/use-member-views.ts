import {
    type MemberView,
    type SharedViewsParseResult,
    buildViewsForDelete,
    buildViewsForSave,
    parseSharedViewsJSON
} from '../member-views';
import {getSharedViewsJSON, useMutateSharedViews} from '../../shared/use-mutate-shared-views';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
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
    const mutateSharedViews = useMutateSharedViews();

    return useCallback(async (name: string, filter: string, originalView?: MemberView) => {
        await mutateSharedViews(allViews => buildViewsForSave(allViews, name, filter, originalView));
    }, [mutateSharedViews]);
}

export function useDeleteMemberView() {
    const mutateSharedViews = useMutateSharedViews();

    return useCallback(async (view: MemberView) => {
        await mutateSharedViews(allViews => buildViewsForDelete(allViews, view));
    }, [mutateSharedViews]);
}

export function useActiveMemberView(views: MemberView[], nql: string | undefined): MemberView | null {
    return useMemo(() => {
        if (!nql || views.length === 0) {
            return null;
        }

        return views.find(view => view.filter.filter === nql) ?? null;
    }, [views, nql]);
}
