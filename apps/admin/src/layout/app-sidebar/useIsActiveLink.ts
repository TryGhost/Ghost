import { useLocation, useMatch } from "@tryghost/admin-x-framework";

interface UseIsActiveLinkOptions {
    path?: string;
    activeOnSubpath?: boolean;
    /**
     * For parent links with submenus: if true, suppress active state when a child is active.
     * Used with SubmenuContext to avoid parent/child both being highlighted.
     */
    suppressWhenChildActive?: boolean;
}

/**
 * Hook to determine if a navigation link should be highlighted as active.
 * 
 * Matching behavior:
 * - Links WITH query params: Requires EXACT match of all query parameters (order-independent)
 *   Example: "posts?type=draft" only matches "posts?type=draft", not "posts?type=draft&tag=news"
 * 
 * - Links WITHOUT query params (parent links): Match their pathname
 *   - Use suppressWhenChildActive with SubmenuContext to prevent parent/child both being active
 * 
 * Example with SubmenuProvider:
 * 1. Navigate to "posts" (no params): Only "Posts" parent is active
 * 2. Click "Drafts" (posts?type=draft): Only "Drafts" is active (parent suppressed by context)
 * 3. Add filter (posts?author=john): Only "Posts" is active (no child matches, so not suppressed)
 */

/**
 * Compare two URLSearchParams objects for exact equality.
 * Both must have the same keys with the same values (order doesn't matter).
 */
function areSearchParamsEqual(params1: URLSearchParams, params2: URLSearchParams): boolean {
    // Quick check: different number of params means not equal
    const keys1 = Array.from(params1.keys());
    const keys2 = Array.from(params2.keys());
    
    if (keys1.length !== keys2.length) {
        return false;
    }

    // Check that all keys in params1 exist in params2 with the same values
    for (const [key, value] of params1.entries()) {
        if (params2.get(key) !== value) {
            return false;
        }
    }

    return true;
}

export function useIsActiveLink({ path, activeOnSubpath = false }: UseIsActiveLinkOptions): boolean {
    const location = useLocation();

    // Split path into pathname and search params
    const [targetPath, targetSearch] = path ? path.split('?') : ['', ''];
    const pattern = activeOnSubpath && targetPath ? `${targetPath}/*` : targetPath;
    const match = useMatch(pattern || '');

    // Early return after all hooks are called
    if (!path) {
        return false;
    }

    // If pathname doesn't match, return false
    if (match === null) {
        return false;
    }

    // If the target path has query parameters, check for EXACT match
    if (targetSearch) {
        const targetParams = new URLSearchParams(targetSearch);
        const currentParams = new URLSearchParams(location.search);

        // For submenu items with query params, require exact match (all params must match exactly)
        return areSearchParamsEqual(targetParams, currentParams);
    }

    // Parent link without query params: match when pathname matches
    return true;
}
