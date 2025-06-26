import {HostLimitError, useLimiter} from './useLimiter';
import {useCallback} from 'react';
import {useGlobalData} from '../components/providers/GlobalDataProvider';

interface UseCheckThemeLimitErrorReturn {
    checkThemeLimitError: (themeName?: string) => Promise<string | null>;
    isThemeLimited: boolean;
    isThemeLimitCheckReady: boolean;
    allowedThemesList: string[] | undefined;
}

export const useCheckThemeLimitError = (): UseCheckThemeLimitErrorReturn => {
    const limiter = useLimiter();
    const {config} = useGlobalData();
    
    const checkError = useCallback(async (themeName?: string): Promise<string | null> => {
        if (!limiter?.isLimited('customThemes')) {
            return null;
        }
        
        const allowlist = config.hostSettings?.limits?.customThemes?.allowlist as string[] | undefined;
        const isSingleTheme = allowlist?.length === 1;
        
        // Single theme: always error
        // Multiple themes: error if specific theme not in allowlist
        const shouldError = isSingleTheme || (themeName && allowlist && !allowlist.includes(themeName.toLowerCase()));
        
        if (!shouldError) {
            return null;
        }
        
        try {
            // Use '.' for single theme to force error, or specific theme name
            const value = isSingleTheme ? '.' : (themeName || '.');
            await limiter.errorIfWouldGoOverLimit('customThemes', {value});
            return null; // No error
        } catch (error) {
            if (error instanceof HostLimitError) {
                return error.message || 'Your current plan doesn\'t support changing themes.';
            }
            return null;
        }
    }, [limiter, config.hostSettings?.limits?.customThemes?.allowlist]);
    
    return {
        checkThemeLimitError: checkError,
        isThemeLimited: limiter?.isLimited('customThemes') || false,
        isThemeLimitCheckReady: limiter !== undefined,
        allowedThemesList: config.hostSettings?.limits?.customThemes?.allowlist as string[] | undefined
    };
};