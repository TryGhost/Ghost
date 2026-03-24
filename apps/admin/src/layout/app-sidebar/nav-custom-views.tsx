import { useMemo } from 'react';
import { NavSavedViews } from './nav-saved-views';
import { useSharedViews } from './shared-views';
import { useEmberRouting } from '@/ember-bridge';

interface NavCustomViewsProps {
    route?: 'posts' | 'pages';
}

export function NavCustomViews({ route = 'posts' }: NavCustomViewsProps) {
    const routing = useEmberRouting();
    const sharedViews = useSharedViews(route);

    const customViews = useMemo(() => {
        return sharedViews.map((view) => {
            const to = routing.getRouteUrl(route, view.filter);

            return {
                key: to,
                name: view.name,
                to,
                isActive: routing.isRouteActive(route, view.filter),
                color: view.color
            };
        });
    }, [route, routing, sharedViews]);

    return <NavSavedViews views={customViews} />;
}
