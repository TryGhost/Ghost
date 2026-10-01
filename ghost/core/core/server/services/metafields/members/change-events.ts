import { z } from 'zod';
import type { MetafieldChangeEntry } from '@tryghost/metafield-types';
import type { MetafieldValuesService } from '../values-service';

/** The member columns an entry is shown with: only what a feed row needs. */
const FeedMember = z.object({
  id: z.string(),
  uuid: z.string(),
  name: z.string().nullable(),
  email: z.string(),
});

/** An activity feed entry with its member, as the members events endpoint returns it. */
export type MetafieldChangeEvent = MetafieldChangeEntry<Date> & {
  member: z.output<typeof FeedMember>;
};

/**
 * Entries from members' activity feeds, newest first, each with its member, as one page
 * of the members events endpoint reads them.
 */
export async function browseMemberChangeEvents(
  values: MetafieldValuesService,
  options: { limit?: number; filter?: object },
): Promise<{ events: MetafieldChangeEvent[]; total: number }> {
  const { events, total } = await values.browseChangeEvents({
    ...options,
    entity: { columns: ['uuid', 'name', 'email'], schema: FeedMember },
  });
  return {
    events: events.map(({ entity_id: memberId, entity: member, ...event }) => ({
      ...event,
      member_id: memberId,
      member,
    })),
    total,
  };
}
