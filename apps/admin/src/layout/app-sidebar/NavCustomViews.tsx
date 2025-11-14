import { useMemo } from 'react';
import { z } from 'zod';
import { useBrowseSettings, getSettingValue } from '@tryghost/admin-x-framework/api/settings';
import { NavMenuItem } from './NavMenuItem';

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

function getColorHex(color: string): string {
    const colorMap: Record<string, string> = {
        'midgrey': '#7C8B9A',
        'blue': '#14b8ff',
        'green': '#30cf43',
        'red': '#f50b23',
        'teal': '#4dcddc',
        'purple': '#8e42ff',
        'yellow': '#ffb41f',
        'orange': '#fe8b05',
        'pink': '#fb2d8d'
    };
    return colorMap[color] || '#7C8B9A';
}

interface NavCustomViewsProps {
    route?: 'posts' | 'pages';
}

export function NavCustomViews({ route = 'posts' }: NavCustomViewsProps) {
    const { data: settingsData } = useBrowseSettings();
    
    const customViews = useMemo(() => {
        const sharedViewsJson = getSettingValue<string>(settingsData?.settings, 'shared_views') ?? '[]';
        
        try {
            const parsed: unknown = JSON.parse(sharedViewsJson);
            const result = customViewsArraySchema.safeParse(parsed);
            
            if (!result.success) {
                console.error('Failed to validate shared_views setting:', result.error);
                return [];
            }
            
            return result.data.filter(view => view.route === route);
        } catch (e) {
            console.error('Failed to parse shared_views setting:', e);
            return [];
        }
    }, [settingsData, route]);

    if (customViews.length === 0) {
        return null;
    }

    return (
        <>
            {customViews.map((view, index) => (
                <NavMenuItem key={`${view.name}-${view.color}-${index}`}>
                    <NavMenuItem.Link 
                        className="pl-9" 
                        to={`${route}?${buildQueryString(view.filter)}`}
                    >
                        <NavMenuItem.Label className="grow">{view.name}</NavMenuItem.Label>
                        <span 
                            className="size-2 rounded-full shrink-0 mx-0.5" 
                            style={{ backgroundColor: getColorHex(view.color) }}
                        />
                    </NavMenuItem.Link>
                </NavMenuItem>
            ))}
        </>
    );
}

