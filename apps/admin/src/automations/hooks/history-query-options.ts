// History refresh is explicit and independent of Performance list interactions.
export const historyQueryOptions = {
  defaultErrorHandler: false,
  staleTime: Infinity,
  gcTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  retry: false,
} as const;
