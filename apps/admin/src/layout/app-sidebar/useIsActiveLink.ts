import { useLocation, useMatch } from "@tryghost/admin-x-framework";

interface UseIsActiveLinkOptions {
    path?: string;
    activeOnSubpath?: boolean;
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

    // If the target path has query parameters, check if they match
    if (targetSearch) {
        const targetParams = new URLSearchParams(targetSearch);
        const currentParams = new URLSearchParams(location.search);

        // Check if all target params are present in current params with matching values
        for (const [key, value] of targetParams.entries()) {
            if (currentParams.get(key) !== value) {
                return false;
            }
        }
        return true;
    }

    // If target has no query params but current location does, only match if no conflicting params
    // For the main link (e.g., "posts" without params), it should only be active when there are no query params
    if (!targetSearch && location.search) {
        // If we're not matching on subpaths and the current location has search params,
        // this link should not be active (allows submenu items to take precedence)
        return false;
    }

    return true;
}
