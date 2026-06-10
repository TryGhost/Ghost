import {getSettingValue, useBrowseSettings, useEditSettings} from '@tryghost/admin-x-framework/api/settings';
import {parseAllSharedViewsJSON} from '../members/shared-views';
import {useCallback} from 'react';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import type {SharedView} from '../members/shared-views';

const SHARED_VIEWS_INVALID_ERROR = 'Cannot modify saved views because shared_views is invalid';

export function getSharedViewsJSON(settingsData: {settings: Array<{key: string; value: string | boolean | null}>} | undefined): string {
    return getSettingValue<string>(settingsData?.settings ?? null, 'shared_views') ?? '[]';
}

/**
 * Shared save/delete scaffold for the shared_views setting: parses the
 * current setting (all routes), applies `buildNext` and persists the result.
 * The posts and members view hooks are thin wrappers around this.
 */
export function useMutateSharedViews() {
    const {data: settingsData} = useBrowseSettings();
    const {mutateAsync: editSettings} = useEditSettings();
    const handleError = useHandleError();

    return useCallback(async (buildNext: (allViews: SharedView[]) => SharedView[]) => {
        const parsedSharedViews = parseAllSharedViewsJSON(getSharedViewsJSON(settingsData));

        if (!parsedSharedViews.ok) {
            const error = new Error(SHARED_VIEWS_INVALID_ERROR, {cause: parsedSharedViews.error});
            handleError(error, {withToast: false});
            throw error;
        }

        const updatedViews = buildNext(parsedSharedViews.views);

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
