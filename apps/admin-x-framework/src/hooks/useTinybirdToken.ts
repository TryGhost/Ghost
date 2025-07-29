import {getTinybirdToken} from '../api/tinybird';

export interface UseTinybirdTokenResult {
    token: string | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

export interface UseTinybirdTokenOptions {
    enabled?: boolean;
}

// Track if we've already logged the warning to avoid spamming the console
let hasLoggedConfigWarning = false;

export const useTinybirdToken = (options: UseTinybirdTokenOptions = {}): UseTinybirdTokenResult => {
    const {enabled = true} = options;
    const tinybirdQuery = getTinybirdToken({enabled});

    const apiToken = tinybirdQuery.data?.tinybird?.token;
    
    // Only treat actual API errors as errors, not null/undefined tokens
    // A null token just means Tinybird is not configured, which is valid
    const error = tinybirdQuery.error as Error | null;
    
    // Log a warning ONCE if we got a response but no valid token (likely misconfiguration)
    if (!tinybirdQuery.isLoading && enabled && tinybirdQuery.data && !apiToken && !hasLoggedConfigWarning) {
        // eslint-disable-next-line no-console
        console.warn('Tinybird analytics: No valid token received. Check your Tinybird configuration (workspaceId and adminToken must be non-empty strings).');
        hasLoggedConfigWarning = true;
    }
    
    return {
        token: (apiToken && typeof apiToken === 'string') ? apiToken : undefined,
        isLoading: tinybirdQuery.isLoading,
        error,
        refetch: tinybirdQuery.refetch
    };
};