import {useMemo} from 'react';
import {parseAllSharedViewsJSON} from '@tryghost/posts/src/views/members/shared-views';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';

export type {SharedView} from '@tryghost/posts/src/views/members/shared-views';

export function getColorHex(color: string): string {
    const colorMap: Record<string, string> = {
        midgrey: '#7C8B9A',
        blue: '#14b8ff',
        green: '#30cf43',
        red: '#f50b23',
        teal: '#4dcddc',
        purple: '#8e42ff',
        yellow: '#ffb41f',
        orange: '#fe8b05',
        pink: '#fb2d8d'
    };

    return colorMap[color] || '#7C8B9A';
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
