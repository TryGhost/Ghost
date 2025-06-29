import {getTinybirdToken} from '../api/tinybird';

export interface UseTinybirdTokenResult {
    token: string | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

export const useTinybirdToken = (): UseTinybirdTokenResult => {
    const tinybirdQuery = getTinybirdToken();

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