import { useBrowseActions } from '@tryghost/admin-x-framework/api/actions';
import { useEffect, useMemo } from 'react';
import type { Segment } from '@tryghost/admin-x-framework/api/segments';

/** Who made a segment and who last changed it, and when. */
export interface SegmentFacts {
  createdBy?: string;
  createdAt?: string;
  editedBy?: string;
  editedAt?: string;
}

const NO_FACTS: SegmentFacts = {};

/**
 * Who made and last changed each segment, read from History: Ghost keeps authorship in the
 * action log, not in columns on the record. A segment has no facts when History holds no action
 * for it, as with a saved view moved to the segments table by the migration.
 *
 * POC (poc/segments-ui): reads the newest 100 segment actions in the browser. The segments API
 * would return these with each segment.
 */
export function useSegmentFacts(segments: Segment[]): (id: string) => SegmentFacts {
  const { data, refetch } = useBrowseActions({
    searchParams: { include: 'actor', limit: '100', filter: 'resource_type:segment' },
    defaultErrorHandler: false,
  });

  // A segment write logs an action, which nothing else tells this query about.
  const signature = segments.map(({ id, name, filter }) => `${id}:${name}:${filter}`).join('\n');
  useEffect(() => {
    void refetch();
  }, [signature, refetch]);

  const facts = useMemo(() => {
    const bySegment = new Map<string, SegmentFacts>();
    // Newest first, so the first edit met for a segment is its latest.
    for (const action of data?.actions ?? []) {
      if (!action.resource_id) {
        continue;
      }
      const known = bySegment.get(action.resource_id) ?? {};
      if (action.event === 'added') {
        known.createdBy = action.actor?.name;
        known.createdAt = action.created_at;
      } else if (action.event === 'edited' && !known.editedAt) {
        known.editedBy = action.actor?.name;
        known.editedAt = action.created_at;
      }
      bySegment.set(action.resource_id, known);
    }
    return bySegment;
  }, [data?.actions]);

  return useMemo(() => (id: string) => facts.get(id) ?? NO_FACTS, [facts]);
}
