import { QueryClient } from '@tanstack/react-query';
import { defaultUnsplashConfig, type TopLevelFrameworkProps } from '@tryghost/admin-x-framework';

/**
 * The framework props every browser-mode render runs on: a fresh QueryClient
 * per render carrying the production defaults (admin-x-framework
 * utils/query-client.ts), so nothing outlives the test and no spec can drift
 * onto its own caching or retry behaviour.
 */
export function createFrameworkProps(
  overrides: Partial<TopLevelFrameworkProps> = {},
): TopLevelFrameworkProps {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 5 * (60 * 1000), // 5 mins
        gcTime: 10 * (60 * 1000), // 10 mins
        // We have custom retry logic for specific errors in fetchApi()
        retry: false,
        networkMode: 'always',
      },
    },
  });

  return {
    ghostVersion: '',
    externalNavigate: () => {},
    // Production shape, but without the real API key so tests never hit Unsplash
    unsplashConfig: { ...defaultUnsplashConfig, Authorization: '' },
    sentryDSN: null,
    onUpdate: () => {},
    onInvalidate: () => {},
    onDelete: () => {},
    queryClient,
    ...overrides,
  };
}
