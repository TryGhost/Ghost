import {useMemo} from 'react';
import {POSTS_VIEW_COLOR_HEX, parseAllSharedViewsJSON} from '@tryghost/posts/api';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';

export type {SharedView} from '@tryghost/posts/api';

export function getColorHex(color: string): string {
    return POSTS_VIEW_COLOR_HEX[color] || POSTS_VIEW_COLOR_HEX.midgrey;
}

export function useSharedViews(route?: string) {
    const {data: settingsData} = useBrowseSettings();

    return useMemo(() => {
        // TODO: Consolidate shared view parsing once the admin and posts apps are merged.
        const sharedViewsJson = getSettingValue<string>(settingsData?.settings, 'shared_views') ?? '[]';
        const parsed = parseAllSharedViewsJSON(sharedViewsJson);

        if (!parsed.ok) {
            console.error('Failed to parse shared_views setting:', parsed.error);
            return [];
        }

        if (!route) {
            return parsed.views;
        }

        return parsed.views.filter(view => view.route === route);
    }, [settingsData, route]);
}
