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
    staleTime: 110 * 60 * 1000 // 110 minutes - prevent refetch during navigation
} as const;

export const useTinybirdToken = (): UseTinybirdTokenResult => {
    console.log('🐦 useTinybirdToken called');
    const tinybirdQuery = getTinybirdToken(TINYBIRD_QUERY_OPTIONS);
    
    console.log('🐦 Query state:', {
        isLoading: tinybirdQuery.isLoading,
        isFetching: tinybirdQuery.isFetching,
        isStale: tinybirdQuery.isStale,
        hasData: !!tinybirdQuery.data,
        dataUpdatedAt: new Date(tinybirdQuery.dataUpdatedAt || 0).toLocaleTimeString(),
        status: tinybirdQuery.status,
        fetchStatus: tinybirdQuery.fetchStatus
    });

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