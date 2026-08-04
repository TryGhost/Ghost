import {buildPostViewUrl, getDefaultPostViews, isPostViewActive} from './post-sidebar-views';
import {isContributorUser} from '@tryghost/admin-x-framework/api/users';
import {type NavSavedView} from './nav-saved-views';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {useEmberRouting} from '@/ember-bridge';
import {useFeatureFlag} from '@tryghost/admin-x-framework/hooks';
import {useLocation} from '@tryghost/admin-x-framework';
import {useMemo} from 'react';
import {useSharedViews} from './shared-views';
import type {PostResource} from '@/posts/list/post-resource';

/**
 * Everything the sidebar needs for a posts/pages nav item, from whichever
 * implementation currently owns the route.
 *
 * Both sources are computed on every render and only the result is chosen —
 * hooks can't be called conditionally, and the flag can flip at runtime.
 */

export interface PostNavigation {
    /** Where the top-level item links to. */
    mainUrl: string;
    /** Highlighted only when no view is active, matching Ember. */
    isMainActive: boolean;
    defaultViews: NavSavedView[];
    customViews: NavSavedView[];
}

function useReactPostNavigation(route: PostResource): PostNavigation {
    const location = useLocation();
    const sharedViews = useSharedViews(route);
    const {data: currentUser} = useCurrentUser();
    const isContributor = Boolean(currentUser && isContributorUser(currentUser));

    return useMemo(() => {
        const toNavView = (name: string, filter: Record<string, string | null>, color?: string): NavSavedView => ({
            key: buildPostViewUrl(route, filter),
            name,
            to: buildPostViewUrl(route, filter),
            isActive: isPostViewActive(location, route, filter),
            color
        });

        // Pages have no default views in Ember, only posts.
        const defaultViews = route === 'posts'
            ? getDefaultPostViews(isContributor).map(view => toNavView(view.name, view.filter))
            : [];

        const customViews = sharedViews.map(view => toNavView(view.name, view.filter, view.color));

        return {
            mainUrl: route,
            // Ember highlights the parent only when no view underneath is.
            isMainActive: location.pathname === `/${route}`
                && ![...defaultViews, ...customViews].some(view => view.isActive),
            defaultViews,
            customViews
        };
    }, [location, route, sharedViews, isContributor]);
}

function useEmberPostNavigation(route: PostResource): PostNavigation {
    const routing = useEmberRouting();
    const sharedViews = useSharedViews(route);

    return useMemo(() => {
        const defaultViews = route === 'posts'
            ? POST_DEFAULT_VIEW_LINKS.map(view => ({
                key: view.to,
                name: view.name,
                to: view.to,
                isActive: routing.isRouteActive(route, view.filter)
            }))
            : [];

        return {
            mainUrl: routing.getRouteUrl(route),
            isMainActive: routing.isRouteActive(route),
            defaultViews,
            customViews: sharedViews.map((view) => {
                const to = routing.getRouteUrl(route, view.filter);

                return {
                    key: to,
                    name: view.name,
                    to,
                    isActive: routing.isRouteActive(route, view.filter),
                    color: view.color
                };
            })
        };
    }, [route, routing, sharedViews]);
}

/** The Ember branch keeps its hardcoded links, as `nav-content` had them. */
const POST_DEFAULT_VIEW_LINKS = [
    {name: 'Drafts', to: 'posts?type=draft', filter: {type: 'draft'}},
    {name: 'Scheduled', to: 'posts?type=scheduled', filter: {type: 'scheduled'}},
    {name: 'Published', to: 'posts?type=published', filter: {type: 'published'}}
];

export function usePostNavigation(route: PostResource = 'posts'): PostNavigation {
    const reactOwnsList = useFeatureFlag('postsListReact');
    const reactNavigation = useReactPostNavigation(route);
    const emberNavigation = useEmberPostNavigation(route);

    return reactOwnsList ? reactNavigation : emberNavigation;
}
