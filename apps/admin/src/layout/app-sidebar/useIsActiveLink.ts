import { useLocation, useMatch } from "@tryghost/admin-x-framework";

interface UseIsActiveLinkOptions {
    path?: string;
    activeOnSubpath?: boolean;
}

/**
 * Hook to determine if a navigation link should be highlighted as active.
 * 
 * Matching behavior:
 * - Links WITH query params: Requires EXACT match of all query parameters (order-independent)
 *   Example: "posts?type=draft" only matches "posts?type=draft", not "posts?type=draft&tag=news"
 * 
 * - Links WITHOUT query params (parent links): Always match their pathname as a fallback
 *   This allows parent links to be highlighted when:
 *   - Navigating to the base path with no filters
 *   - Applying filters that don't match any specific submenu item
 * 
 * Example scenario:
 * 1. Click "Drafts" (posts?type=draft): Both "Posts" and "Drafts" are active
 * 2. Add filter to get (posts?type=draft&author=john): Only "Posts" is active (fallback)
 * 3. Click custom view (posts?type=draft&tag=news): Both "Posts" and custom view are active
 * 
 * Note: When both parent and submenu are active, CSS styling ensures only the submenu 
 * appears highlighted due to its visual prominence and indentation.
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

    // Parent link without query params:
    // - Match if there are no query params in current location (exact match)
    // - Also match if there ARE query params (fallback when no submenu item matches)
    // This allows the parent to be highlighted when navigating with filters
    // that don't correspond to any specific submenu item
    return true;
}
