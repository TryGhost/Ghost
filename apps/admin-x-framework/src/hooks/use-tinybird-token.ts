import { useCallback } from 'react';
import { useTinybirdTokenQuery } from '../api/tinybird';
import { useWebAnalyticsEnabled } from '../api/settings';

export interface UseTinybirdTokenResult {
  token: string | undefined;
  isLoading: boolean;
  error: Error | null;
  /** Refetches the token query and resolves the fresh token, if any. */
  refetch: () => Promise<string | undefined>;
}

export interface UseTinybirdTokenOptions {
  enabled?: boolean;
}

// Track if we've already logged the warning to avoid spamming the console
let hasLoggedConfigWarning = false;

export const useTinybirdToken = (options: UseTinybirdTokenOptions = {}): UseTinybirdTokenResult => {
  const { enabled = true } = options;
  // Web analytics is a global kill-switch read from settings, so no call site threads it.
  const webAnalyticsEnabled = useWebAnalyticsEnabled();
  const effectiveEnabled = enabled && webAnalyticsEnabled;
  const tinybirdQuery = useTinybirdTokenQuery({ enabled: effectiveEnabled });

  const refetchQuery = tinybirdQuery.refetch;
  const refetch = useCallback(async () => {
    const result = await refetchQuery();
    const freshToken = result.data?.tinybird?.token;
    return typeof freshToken === 'string' && freshToken ? freshToken : undefined;
  }, [refetchQuery]);

  // A disabled React Query can keep cached data/errors, so return an idle
  // result — else direct consumers (the providers) leak a stale token.
  if (!effectiveEnabled) {
    return {
      token: undefined,
      isLoading: false,
      error: null,
      refetch,
    };
  }

  const apiToken = tinybirdQuery.data?.tinybird?.token;

  // Only treat actual API errors as errors, not null/undefined tokens
  // A null token just means Tinybird is not configured, which is valid
  const error = tinybirdQuery.error as Error | null;

  // Log a warning ONCE if we got a response but no valid token (likely misconfiguration)
  if (!tinybirdQuery.isLoading && tinybirdQuery.data && !apiToken && !hasLoggedConfigWarning) {
    // eslint-disable-next-line no-console
    console.warn(
      'Tinybird analytics: No valid token received. Check your Tinybird configuration (workspaceId and adminToken must be non-empty strings).',
    );
    hasLoggedConfigWarning = true;
  }

  return {
    token: apiToken && typeof apiToken === 'string' ? apiToken : undefined,
    isLoading: tinybirdQuery.isLoading,
    error,
    refetch,
  };
};
