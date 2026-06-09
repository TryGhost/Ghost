import { useCallback } from "react";
import { useLocation, useSearchParams } from "@tryghost/admin-x-framework";

const FILTER_KEYS = ["type", "visibility", "author", "tag", "order"] as const;

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
            // exact match over all known filter keys, mirroring Ember's
            // customViews isFilterEqual(cleanFilter(view.filter), queryParams)
            return FILTER_KEYS.every((key) => {
                const filterValue = filter[key] || null;
                const paramValue = searchParams.get(key) || null;
                return filterValue === paramValue;
            });
        },
        [onRoute, searchParams],
    );

    return { onRoute, isFilterActive };
}
