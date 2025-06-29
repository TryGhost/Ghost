import {getTinybirdToken} from '../api/tinybird';

export interface UseTinybirdTokenResult {
    token: string | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

export const useTinybirdToken = (): UseTinybirdTokenResult => {
    const tinybirdQuery = getTinybirdToken({
        refetchInterval: 120 * 60 * 1000, // 2 hours — tokens expire after 3 hours
        refetchIntervalInBackground: true
    });

    const apiToken = tinybirdQuery.data?.tinybird?.token;
    
    return {
        token: (apiToken && typeof apiToken === 'string') ? apiToken : undefined,
        isLoading: tinybirdQuery.isLoading,
        error: tinybirdQuery.error as Error | null,
        refetch: tinybirdQuery.refetch
    };
};