// Fetch on selection or retry; list controls do not refresh the selected history.
export const historyQueryOptions = {
  defaultErrorHandler: false,
  staleTime: Infinity,
  gcTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: false,
} as const;
