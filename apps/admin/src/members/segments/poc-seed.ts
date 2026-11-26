import {
  useAddSegment,
  useBrowseSegments,
  useDeleteSegment,
  useInvalidateSegments,
} from '@tryghost/admin-x-framework/api/segments';
import { useState } from 'react';
import { resetPrototypeState } from './poc-store';

/**
 * POC (poc/segments-ui) only: the segments the prototype is shown with, for putting the site back
 * after it has been cleared to film or try the empty states. Their filters are written the way
 * Admin writes them, so none opens as changed. "Gold and Silver" names this dev site's tiers.
 */
const SEED: ReadonlyArray<{ name: string; filter: string }> = [
  { name: 'New in the last 90 days', filter: 'created_at:>=now-90d' },
  { name: 'Active in the last 30 days', filter: 'last_seen_at:>=now-30d' },
  { name: 'Engaged free readers', filter: 'email_open_rate:>49+status:free' },
  { name: 'Annual subscribers', filter: 'status:paid+subscriptions.plan_interval:year' },
  {
    name: 'Gold and Silver',
    filter: 'tier_id:[000000006de4f1809f1d516a,00000000b8525c3a4ba1176f]',
  },
  { name: 'At-risk paid members', filter: 'email_open_rate:<20+status:paid' },
  { name: 'Past due', filter: 'subscriptions.status:past_due' },
  { name: 'Complimentary', filter: 'status:comped' },
  { name: 'Newsletter disabled', filter: '(email_disabled:1)' },
];

const normalizeName = (name: string) => name.trim().toLowerCase();

/**
 * Clearing and seeding the site's segments, from the prototype controls. Real: each segment is
 * deleted or added through the segments API, one at a time, so History records them as usual.
 */
export function usePrototypeSeed() {
  const { data } = useBrowseSegments();
  const { mutateAsync: addSegment } = useAddSegment();
  const { mutateAsync: deleteSegment } = useDeleteSegment();
  const refetchSegments = useInvalidateSegments();
  const [working, setWorking] = useState<'clearing' | 'seeding' | null>(null);
  const segments = data?.segments ?? [];

  /** Deletes every segment, and resets the prototype's own state. */
  const clear = async () => {
    setWorking('clearing');
    try {
      for (const segment of segments) {
        try {
          await deleteSegment(segment.id);
        } catch {
          // Gone already, deleted elsewhere since this page loaded the list: carry on.
        }
      }
      resetPrototypeState();
    } finally {
      // The list as the server has it, whatever was deleted elsewhere meanwhile.
      refetchSegments();
      setWorking(null);
    }
  };

  /** Adds the seed segments the site doesn't have. */
  const seed = async () => {
    setWorking('seeding');
    try {
      for (const { name, filter } of SEED) {
        const exists = segments.some(
          (segment) => normalizeName(segment.name) === normalizeName(name),
        );
        if (!exists) {
          await addSegment({ name, filter });
        }
      }
    } finally {
      refetchSegments();
      setWorking(null);
    }
  };

  return { clear, seed, working, count: segments.length };
}
