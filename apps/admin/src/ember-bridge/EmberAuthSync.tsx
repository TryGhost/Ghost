import { useEffect, useRef } from "react";
import { useLocation } from "@tryghost/admin-x-framework";
import { useQueryClient } from "@tanstack/react-query";

const AUTH_ROUTES = new Set(["setup", "signin", "signout", "signup", "reset"]);

const isAuthRoute = (path: string) => {
    // Remove leading slash and extract the first path segment
    // Also strip any query params or hash fragments
    const cleanPath = path.replace(/^\//, '').split(/[/?#]/)[0];

    return AUTH_ROUTES.has(cleanPath);
};


export function useEmberAuthSync() {
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
}
