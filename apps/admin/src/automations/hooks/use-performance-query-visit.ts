import { useEffect, useId, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Own cached results for one hook's visit, including inactive and pending queries.
export const usePerformanceQueryVisit = (automationId: string) => {
  const queryClient = useQueryClient();
  const visitId = `${useId()}:${automationId}`;
  const mountedVisit = useRef<string | null>(null);
  useEffect(() => {
    mountedVisit.current = visitId;
    return () => {
      mountedVisit.current = null;
      // Strict Mode immediately remounts the same visit; navigation does not.
      queueMicrotask(() => {
        if (mountedVisit.current !== visitId) {
          queryClient.removeQueries({
            predicate: (query) => query.meta?.performanceQueryVisit === visitId,
          });
        }
      });
    };
  }, [queryClient, visitId]);
  return { performanceQueryVisit: visitId };
};
