import {useMatches} from '@tryghost/admin-x-framework';

export function useCurrentPage(): string {
    const matches = useMatches();

    // Find the index of the activitypub base path route
    const basePathIndex = matches.findIndex(match => match.handle === 'activitypub-basepath');

    if (basePathIndex === -1) {
        return '';
    }

    // Get the next route after the base path (the child route)
    const childRoute = matches[basePathIndex + 1];

    if (!childRoute) {
        return '';
    }

    // Get the base path route to extract its pathname
    const basePathRoute = matches[basePathIndex];

    // Remove the base path from the child route's pathname to get the relative segment
    const basePath = basePathRoute.pathname;
    const childPath = childRoute.pathname;

    // Remove base path prefix
    let relativePath = childPath.startsWith(basePath)
        ? childPath.slice(basePath.length)
        : childPath;

    // Remove leading slash and get first segment
    relativePath = relativePath.replace(/^\//, '');
    const segment = relativePath.split('/')[0];

    return segment;
}
