import { useCallback } from "react";
import {
    POSTS_VIEW_FILTER_KEYS,
    isPostsViewFilterEqual,
} from "@tryghost/posts/api";
import { useLocation, useSearchParams } from "@tryghost/admin-x-framework";

export type PostsViewFilter = Partial<Record<string, string | null>>;

/**
 * React-side active matching for posts/pages list views (default views,
 * custom views and the main nav links).
 *
 * This deliberately does NOT go through the Ember routing bridge: React
 * Router navigates with pushState, which fires no hashchange, so the hidden
 * Ember router never sees query-param-only changes and its
 * currentRoute.queryParams go stale. React Router itself stays correct in
 * both flag states (Ember-driven hash navigation fires popstate).
 */
export function usePostsViewActive(route: "posts" | "pages") {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const onRoute = location.pathname.replace(/\/$/, "") === `/${route}`;

    const isFilterActive = useCallback(
        (filter: PostsViewFilter) => {
            if (!onRoute) {
                return false;
            }
            // exact match over the known filter keys, using the same
            // equality the posts list uses (Ember parity: customViews
            // isFilterEqual(cleanFilter(view.filter), queryParams))
            const currentFilter: Record<string, string> = {};
            for (const key of POSTS_VIEW_FILTER_KEYS) {
                const value = searchParams.get(key);
                if (value) {
                    currentFilter[key] = value;
                }
            }
            return isPostsViewFilterEqual(filter, currentFilter);
        },
        [onRoute, searchParams],
    );

    return { onRoute, isFilterActive };
}
