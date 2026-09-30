// Sidebar content mounts on first open and stays mounted until navigation.
export const performanceQueryOptions = {
  searchParams: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  defaultErrorHandler: false,
  staleTime: Infinity,
  gcTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: false,
} as const;
