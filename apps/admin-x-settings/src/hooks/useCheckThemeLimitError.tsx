import {HostLimitError, useLimiter} from './useLimiter';
import {useCallback} from 'react';
import {useGlobalData} from '../components/providers/GlobalDataProvider';

interface UseCheckThemeLimitErrorReturn {
    checkThemeLimitError: (themeName?: string) => Promise<string | null>;
    isThemeLimited: boolean;
    isThemeLimitCheckReady: boolean;
    allowedThemesList: string[] | undefined;
    noThemeChangesAllowed: boolean;
}

export const useCheckThemeLimitError = (): UseCheckThemeLimitErrorReturn => {
    const limiter = useLimiter();
    const {config} = useGlobalData();

    const allowedThemesList = config.hostSettings?.limits?.customThemes?.allowlist as string[] | undefined;
    // Single theme: always error
    const noThemeChangesAllowed = allowedThemesList?.length === 1 || false;

    const checkError = useCallback(async (themeName?: string): Promise<string | null> => {
        if (!limiter?.isLimited('customThemes')) {
            return null;
        }

        // Multiple themes: error if specific theme not in allowlist, error when no theme changes allowed
        const shouldError = noThemeChangesAllowed || (themeName && allowedThemesList && !allowedThemesList.includes(themeName.toLowerCase()));

        if (!shouldError) {
            return null;
        }

        try {
            // Use '.' for single theme to force error, or specific theme name
            const value = noThemeChangesAllowed ? '.' : (themeName || '.');
            await limiter.errorIfWouldGoOverLimit('customThemes', {value});
            return null; // No error
        } catch (error) {
            if (error instanceof HostLimitError) {
                return error.message || 'Your current plan doesn\'t support changing themes.';
            }
            return null;
        }
    }, [limiter, allowedThemesList, noThemeChangesAllowed]);

    return {
        checkThemeLimitError: checkError,
        isThemeLimited: limiter?.isLimited('customThemes') || false,
        isThemeLimitCheckReady: limiter !== undefined,
        allowedThemesList,
        noThemeChangesAllowed
    };
};
