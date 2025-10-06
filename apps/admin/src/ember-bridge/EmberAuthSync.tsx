import { useEffect, useRef } from 'react';
import { useLocation } from '@tryghost/admin-x-framework';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Helper function to check if a path is an authentication-related route
 */
const isAuthRoute = (path: string): boolean => {
    return path.startsWith('/setup') ||
           path.startsWith('/signin') ||
           path.startsWith('/signout') ||
           path.startsWith('/signup') ||
           path.startsWith('/reset');
};

/**
 * Component that monitors route changes and invalidates React Query caches
 * when navigating away from authentication routes in Ember
 */
export function EmberAuthSync() {
    const location = useLocation();
    const queryClient = useQueryClient();
    const previousPathRef = useRef<string | null>(null);

    useEffect(() => {
        const currentPath = location.pathname;
        const previousPath = previousPathRef.current;

        // If we're navigating away from an auth route, invalidate all caches
        if (previousPath && isAuthRoute(previousPath) && !isAuthRoute(currentPath)) {
            void queryClient.invalidateQueries();
        }

        // Update the previous path reference
        previousPathRef.current = currentPath;
    }, [location, queryClient]);

    return null;
}

