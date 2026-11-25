import type { Segment } from '@tryghost/admin-x-framework/api/segments';

/** The search parameter that says which segment the members screen is showing. */
export const SEGMENT_PARAM = 'segment';

/**
 * The members screen showing a segment. The filter is what the list applies. The id says which
 * segment it is, so the screen still knows after the filters are changed, and two segments with
 * the same filter are told apart.
 */
export function buildSegmentUrl(segment: Pick<Segment, 'id' | 'filter'>): string {
  const searchParams = new URLSearchParams({ filter: segment.filter, [SEGMENT_PARAM]: segment.id });
  return `/members?${searchParams.toString()}`;
}
