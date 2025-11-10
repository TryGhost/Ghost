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
    const [linkPath] = pathWithQuery.split('?');

    if (activeOnSubpath) {
        // Match any subpath under this route using wildcard pattern
        const pattern = `${linkPath}/*`;
        return matchPath(pattern, location.pathname) !== null;
    } else {
        // Exact path + query match
        const currentFull = `${location.pathname}${location.search}`;
        return currentFull === pathWithQuery;
    }
}
