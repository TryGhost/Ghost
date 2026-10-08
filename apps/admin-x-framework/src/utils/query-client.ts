import { QueryClient } from '@tanstack/react-query';

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__: QueryClient;
  }
}

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

window.__TANSTACK_QUERY_CLIENT__ = queryClient;

export default queryClient;
