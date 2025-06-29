import {getTinybirdToken} from '../api/tinybird';
import {TinybirdTokenResponseType} from '../api/tinybird';

export interface UseTinybirdTokenResult {
    token: string | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

// Calculate refresh interval based on token expiration
const calculateRefreshInterval = (data: TinybirdTokenResponseType) => {
    const exp = data?.tinybird?.exp;
    if (!exp || typeof exp !== 'number') {
        // Fallback to 2 hours if no expiration info
        return 120 * 60 * 1000;
    }
    
    const now = Date.now();
    const expirationTime = exp * 1000; // Convert to milliseconds
    const timeUntilExpiration = expirationTime - now;
    
    // Refresh at 75% of the token lifetime (e.g., 2.25 hours for 3-hour token)
    const refreshTime = Math.max(timeUntilExpiration * 0.75, 60 * 1000); // At least 1 minute
    
    return Math.min(refreshTime, 120 * 60 * 1000); // Cap at 2 hours max
};

// Stable query options - created once and reused
const TINYBIRD_QUERY_OPTIONS = {
    // Dynamic refresh based on token expiration
    refetchInterval: calculateRefreshInterval,
    refetchIntervalInBackground: true
} as const;

export const useTinybirdToken = (): UseTinybirdTokenResult => {
    const tinybirdQuery = getTinybirdToken(TINYBIRD_QUERY_OPTIONS);

    const apiToken = tinybirdQuery.data?.tinybird?.token;
    
    // If we have a successful response but invalid token, create a validation error
    let error = tinybirdQuery.error as Error | null;
    if (!tinybirdQuery.error && tinybirdQuery.data && (!apiToken || typeof apiToken !== 'string')) {
        error = new Error('Invalid token received from API: token must be a non-empty string');
    }
    
    return {
        token: (apiToken && typeof apiToken === 'string') ? apiToken : undefined,
        isLoading: tinybirdQuery.isLoading,
        error,
        refetch: tinybirdQuery.refetch
    };
};