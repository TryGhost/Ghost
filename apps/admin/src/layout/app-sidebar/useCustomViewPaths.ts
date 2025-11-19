import { useMemo } from 'react';
import { z } from 'zod';
import { useBrowseSettings, getSettingValue } from '@tryghost/admin-x-framework/api/settings';

const customViewSchema = z.object({
    name: z.string(),
    route: z.string(),
    color: z.string(),
    icon: z.string().optional(),
    filter: z.record(z.string(), z.string().nullable())
});
const customViewsArraySchema = z.array(customViewSchema);
type CustomView = z.infer<typeof customViewSchema>;

function buildQueryString(filter: CustomView['filter']): string {
    const params = new URLSearchParams(
        Object.entries(filter)
            .filter((entry): entry is [string, string] => entry[1] != null)
    );
    return params.toString();
}

/**
 * Hook to get the paths of all custom views for a given route.
 * Used to pass to parent menu items as childPaths.
 */
export function useCustomViewPaths(route: 'posts' | 'pages' = 'posts'): string[] {
    const { data: settingsData } = useBrowseSettings();
    
    return useMemo(() => {
        const sharedViewsJson = getSettingValue<string>(settingsData?.settings, 'shared_views') ?? '[]';
        
        try {
            const parsed: unknown = JSON.parse(sharedViewsJson);
            const result = customViewsArraySchema.safeParse(parsed);
            
            if (!result.success) {
                return [];
            }
            
            return result.data
                .filter(view => view.route === route)
                .map(view => `${route}?${buildQueryString(view.filter)}`);
        } catch {
            return [];
        }
    }, [settingsData, route]);
}
