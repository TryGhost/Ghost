import {useMemo} from 'react';
import {z} from 'zod';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';

export const sharedViewSchema = z.object({
    name: z.string(),
    route: z.string(),
    color: z.string().optional(),
    icon: z.string().optional(),
    filter: z.record(z.string(), z.string().nullable())
});

const sharedViewsArraySchema = z.array(sharedViewSchema);

export type SharedView = z.infer<typeof sharedViewSchema>;

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
        const sharedViewsJson = getSettingValue<string>(settingsData?.settings, 'shared_views') ?? '[]';

        try {
            const parsed: unknown = JSON.parse(sharedViewsJson);
            const result = sharedViewsArraySchema.safeParse(parsed);

            if (!result.success) {
                console.error('Failed to validate shared_views setting:', result.error);
                return [];
            }

            if (!route) {
                return result.data;
            }

            return result.data.filter(view => view.route === route);
        } catch (error) {
            console.error('Failed to parse shared_views setting:', error);
            return [];
        }
    }, [settingsData, route]);
}
