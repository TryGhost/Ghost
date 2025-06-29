import {getTinybirdToken} from '../api/tinybird';

export interface UseTinybirdTokenResult {
    token: string | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

// Stable query options - created once and reused
const TINYBIRD_QUERY_OPTIONS = {
    refetchInterval: 120 * 60 * 1000, // 2 hours — tokens expire after 3 hours
    refetchIntervalInBackground: true,
    staleTime: 130 * 60 * 1000 // 130 minutes - longer than refetch interval to prevent redundant fetches
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