import { NavMenuItem } from './nav-menu-item';
import { useEmberRouting } from '@/ember-bridge';
import { useSharedViews } from '@tryghost/posts/src/views/members/hooks/use-member-views';

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
    const customViews = useSharedViews(route);
    const routing = useEmberRouting();

    if (customViews.length === 0) {
        return null;
    }

    return (
        <>
            {customViews.map((view) => {
                const viewUrl = routing.getRouteUrl(route, view.filter);
                const isActive = routing.isRouteActive(route, view.filter);

                return (
                    <NavMenuItem key={viewUrl}>
                        <NavMenuItem.Link
                            className="pl-9"
                            to={viewUrl}
                            isActive={isActive}
                        >
                            <NavMenuItem.Label className="grow">{view.name}</NavMenuItem.Label>
                            <span
                                className="size-2 rounded-full shrink-0 mx-0.5"
                                style={{backgroundColor: getColorHex(view.color ?? 'midgrey')}}
                                data-color={view.color ?? 'midgrey'}
                                aria-hidden="true"
                            />
                        </NavMenuItem.Link>
                    </NavMenuItem>
                );
            })}
        </>
    );
}
