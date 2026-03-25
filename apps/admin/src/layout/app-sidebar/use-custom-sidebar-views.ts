import {useMemo} from 'react';
import {type NavSavedView} from './nav-saved-views';
import {useSharedViews} from './shared-views';
import {useEmberRouting} from '@/ember-bridge';

export function useCustomSidebarViews(route: 'posts' | 'pages' = 'posts') {
    const routing = useEmberRouting();
    const sharedViews = useSharedViews(route);

    return useMemo<NavSavedView[]>(() => {
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
}
