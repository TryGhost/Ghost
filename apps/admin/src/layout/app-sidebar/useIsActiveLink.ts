import { useLocation } from 'react-router';
import { useBaseRoute } from '@tryghost/admin-x-framework';

interface UseIsActiveLinkOptions {
    href?: string;
    activeOnSubpath?: boolean;
}

export function useIsActiveLink({ href, activeOnSubpath = false }: UseIsActiveLinkOptions): boolean {
    const location = useLocation();
    const currentBaseRoute = useBaseRoute();

    // Normalize href: strip leading hash and any trailing fragment
    const normalizedHref = href?.startsWith('#') ? href.slice(1) : href;
    const hrefNoHash = normalizedHref?.split('#')[0];

    // Extract path (keep optional query for exact match mode)
    const [linkPath = ''] = (hrefNoHash ?? '').split('?');
    const linkBaseRoute = linkPath.split('/')[1] ?? '';

    let isActive = false;

    if (activeOnSubpath) {
        // Match by first segment only; ignore query and deeper segments
        isActive = !!linkBaseRoute && currentBaseRoute === linkBaseRoute;
    } else if (hrefNoHash) {
        // Exact path + query match
        const currentFull = `${location.pathname}${location.search}`;
        isActive = currentFull === hrefNoHash;
    }

    return isActive;
}
