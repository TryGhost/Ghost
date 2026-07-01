import {getTinybirdToken} from '../api/tinybird';
import {useWebAnalyticsEnabled} from '../providers/app-provider';

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
    // Web analytics is a global kill-switch: never load a token when it's off,
    // regardless of what a caller passes. Read from context so no call site has
    // to thread the flag through.
    const webAnalyticsEnabled = useWebAnalyticsEnabled();
    const effectiveEnabled = enabled && webAnalyticsEnabled;
    const tinybirdQuery = getTinybirdToken({enabled: effectiveEnabled});

    // A disabled React Query (v4) that has never run still reports isLoading:true
    // and can retain previously cached data/errors. Normalize to an idle result so
    // direct consumers (GlobalDataProvider, PostAnalyticsProvider) don't get stuck
    // on a loading placeholder and no stale token/error leaks through when off.
    if (!effectiveEnabled) {
        return {
            token: undefined,
            isLoading: false,
            error: null,
            refetch: tinybirdQuery.refetch
        };
    }

    const apiToken = tinybirdQuery.data?.tinybird?.token;
    
    // Only treat actual API errors as errors, not null/undefined tokens
    // A null token just means Tinybird is not configured, which is valid
    const error = tinybirdQuery.error as Error | null;
    
    // Log a warning ONCE if we got a response but no valid token (likely misconfiguration)
    if (!tinybirdQuery.isLoading && tinybirdQuery.data && !apiToken && !hasLoggedConfigWarning) {
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