import {type NavigateOptions, useNavigate} from '@tryghost/admin-x-framework';
import {useAppBasePath} from './use-app-base-path';
import {useCallback} from 'react';

/**
 * Hook that wraps useNavigate and automatically prepends the app base path
 * for absolute paths (paths starting with '/').
 *
 * Usage:
 * - Relative paths pass through unchanged: navigate('reader') → 'reader'
 * - Absolute paths get base path prepended: navigate('/profile/handle') → '/activitypub/profile/handle'
 * - Navigate back still works: navigate(-1)
 * - Options are preserved: navigate('/reader', {replace: true})
 */
export function useNavigateWithBasePath() {
    const navigate = useNavigate();
    const basePath = useAppBasePath();

    return useCallback((
        to: string | number,
        options?: NavigateOptions
    ) => {
        if (typeof to === 'number') {
            // Handle navigate(-1) etc
            navigate(to, options);
            return;
        }

        if (to.startsWith('/')) {
            // Absolute path - prepend base path
            navigate(`${basePath}${to}`, options);
        } else {
            // Relative path - pass through unchanged
            navigate(to, options);
        }
    }, [navigate, basePath]);
}
