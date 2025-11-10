import { matchPath, useLocation } from "@tryghost/admin-x-framework";

interface UseIsActiveLinkOptions {
    href?: string;
    activeOnSubpath?: boolean;
}

export function useIsActiveLink({ href, activeOnSubpath = false }: UseIsActiveLinkOptions): boolean {
    const location = useLocation();

    if (!href) {
        return false;
    }

    // Normalize href: strip leading hash and any trailing fragment
    const normalizedHref = href.startsWith('#') ? href.slice(1) : href;
    const [pathWithQuery] = normalizedHref.split('#');

    if (activeOnSubpath) {
        // Match by first segment only; ignore query and deeper segments
        const [linkPath] = pathWithQuery.split('?');
        const linkBaseRoute = linkPath.split('/')[1];

        if (!linkBaseRoute) {
            return false;
        }

        // Use matchPath to check if current location starts with this base route
        const pattern = `/${linkBaseRoute}/*`;
        return matchPath(pattern, location.pathname) !== null;
    } else {
        // Exact path + query match
        const currentFull = `${location.pathname}${location.search}`;
        return currentFull === pathWithQuery;
    }
}
