import {useMemo} from 'react';
import {type NavSavedView} from './nav-saved-views';
import {useEmberRouting} from '@/ember-bridge';
import {usePostsViewActive} from './use-posts-view-active';
import {useSharedViews} from './shared-views';

export function useCustomSidebarViews(route: 'posts' | 'pages' = 'posts') {
    const routing = useEmberRouting();
    const sharedViews = useSharedViews(route);
    const {isFilterActive} = usePostsViewActive(route);

    return useMemo<NavSavedView[]>(() => {
        return sharedViews.map((view) => {
            const to = routing.getRouteUrl(route, view.filter);

            return {
                key: to,
                name: view.name,
                to,
                isActive: isFilterActive(view.filter),
                color: view.color
            };
        });
    }, [route, routing, sharedViews, isFilterActive]);
}
