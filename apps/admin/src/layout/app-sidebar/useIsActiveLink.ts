import { useLocation, useMatch } from "@tryghost/admin-x-framework";

interface UseIsActiveLinkOptions {
    path?: string;
    activeOnSubpath?: boolean;
    /**
     * Array of child paths to check. If any child path is active (exact match),
     * this link will not be considered active (used for parent links with submenus).
     */
    childPaths?: string[];
}

/**
 * Hook to determine if a navigation link should be highlighted as active.
 * 
 * Matching behavior:
 * - Links WITH query params: Requires EXACT match of all query parameters (order-independent)
 *   Example: "posts?type=draft" only matches "posts?type=draft", not "posts?type=draft&tag=news"
 * 
 * - Links WITHOUT query params (parent links): Match when pathname matches, BUT:
 *   - If childPaths provided and any child is exactly active, parent is NOT active
 *   - Otherwise, parent is active as a fallback
 * 
 * Example scenario with childPaths:
 * 1. Navigate to "posts" (no params): Only "Posts" parent is active
 * 2. Click "Drafts" (posts?type=draft): Only "Drafts" submenu is active (parent suppressed)
 * 3. Add filter (posts?type=draft&author=john): Only "Posts" parent is active (no child matches, fallback)
 * 4. Click custom view (posts?type=draft&tag=news): Only custom view is active (parent suppressed)
 * 
 * This prevents both parent and child from being highlighted simultaneously while maintaining
 * fallback behavior when filters don't match any defined submenu item.
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

export function useIsActiveLink({ path, activeOnSubpath = false, childPaths = [] }: UseIsActiveLinkOptions): boolean {
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

    // Parent link without query params:
    // Check if any child path is currently active (exact match)
    if (childPaths.length > 0) {
        const currentParams = new URLSearchParams(location.search);
        
        for (const childPath of childPaths) {
            const [, childSearch] = childPath.split('?');
            
            // Check if the child has exact query param match
            if (childSearch) {
                const childParams = new URLSearchParams(childSearch);
                if (areSearchParamsEqual(childParams, currentParams)) {
                    // A child is active, so parent should not be active
                    return false;
                }
            }
        }
    }

    // Match when pathname matches (either no query params, or query params but no child matches)
    return true;
}
