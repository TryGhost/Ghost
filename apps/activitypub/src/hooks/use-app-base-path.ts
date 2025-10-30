import {useMatches} from '@tryghost/admin-x-framework';

/**
 * Hook that returns the app's base path by reading the first route match.
 * This allows the app to be mounted at different paths (e.g., /activitypub or /network or /, like in the test environment)
 * without hardcoding the path throughout the codebase.
 *
 * @returns The base path of the app (e.g., '/activitypub' or '/network' or '')
 */
export function useAppBasePath(): string {
    const matches = useMatches();
    // Find the first match with the handle 'activitypub-basepath'
    const path = matches.find(match => match.handle === 'activitypub-basepath')?.pathname ?? '';

    // Remove trailing slash if it exists
    return path.endsWith('/') ? path.slice(0, -1) : path;
}
