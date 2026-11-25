import { useMemo } from 'react';
import { useMemberViews } from '@/members/hooks/use-member-views';

const SEGMENT_TOKEN = /segment:'([0-9a-f]{24})'/g;

/**
 * POC (poc/segments-ui) only: a members filter this branch's server can count. A segment is named
 * in a recipient filter by its id (`segment:'<id>'`), as the Admin API will take it once segments
 * are a members filter key (DYA-295). Until then the server can't count such a filter, so each
 * segment is swapped for its own conditions, in brackets, for counting only. A segment that isn't
 * known is left as it is. The real version counts the filter as it is, and this goes.
 */
export function useCountableFilter(filter: string | null): string | null {
  const segments = useMemberViews();
  return useMemo(() => {
    if (!filter || !filter.includes("segment:'")) {
      return filter;
    }
    return filter.replace(SEGMENT_TOKEN, (token, id: string) => {
      const segment = segments.find((candidate) => candidate.id === id);
      return segment ? `(${segment.filter})` : token;
    });
  }, [filter, segments]);
}
