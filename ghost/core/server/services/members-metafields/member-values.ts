import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import type { Audience } from './audiences';
import { DbMetafieldChangeEventWithMember, type MetafieldChangeEvent } from './members-resource';
import { knexify } from './metafields/queries';
import { StoredFieldList } from './metafields/schema';
import { MetafieldValuesService } from './metafields/values-service';

const MEMBERS_TABLE = 'members';

/**
 * What each member holds for each field, and the activity feed their writes leave. The feed is
 * read with each entry's member, which is what makes it the members' own.
 */
export class MemberMetafieldValues extends MetafieldValuesService<Audience> {
  /**
   * Entries from members' activity feeds, newest first, each with its member, as one page
   * of the members events endpoint reads them.
   *
   * `filter` is a parsed NQL filter over this table's own columns: mapping the feed's
   * names onto them is the feed's business, and applying them is this table's.
   */
  async browseChangeEvents(
    {
      limit,
      filter,
    }: {
      /** Absent for every entry, as the feed asks for when paging is off. */
      limit?: number;
      filter?: object;
    },
    executor: Knex = this.knex,
  ): Promise<{ events: MetafieldChangeEvent[]; total: number }> {
    const CHANGE_EVENTS_TABLE = this.resource.tables.changeEvents;
    const filtered = () => {
      const query = executor(CHANGE_EVENTS_TABLE);
      return filter ? knexify(query, filter, { tableName: CHANGE_EVENTS_TABLE }) : query;
    };

    // Joined rather than looked up afterwards: an entry cannot outlive its member, whose
    // delete cascades to it, so every entry has one to join.
    const newestFirst = filtered()
      .join(MEMBERS_TABLE, `${MEMBERS_TABLE}.id`, `${CHANGE_EVENTS_TABLE}.member_id`)
      .orderBy([
        { column: `${CHANGE_EVENTS_TABLE}.created_at`, order: 'desc' },
        { column: `${CHANGE_EVENTS_TABLE}.id`, order: 'desc' },
      ]);
    const page = limit === undefined ? newestFirst : newestFirst.limit(limit);

    const [rows, counted] = await Promise.all([
      page.select(
        `${CHANGE_EVENTS_TABLE}.id`,
        `${CHANGE_EVENTS_TABLE}.member_id`,
        `${CHANGE_EVENTS_TABLE}.written_by_type`,
        `${CHANGE_EVENTS_TABLE}.written_by_id`,
        `${CHANGE_EVENTS_TABLE}.source`,
        `${CHANGE_EVENTS_TABLE}.metafields`,
        `${CHANGE_EVENTS_TABLE}.created_at`,
        { member_uuid: `${MEMBERS_TABLE}.uuid` },
        { member_name: `${MEMBERS_TABLE}.name` },
        { member_email: `${MEMBERS_TABLE}.email` },
      ),
      filtered().count({ total: '*' }).first(),
    ]);

    // What to do with an entry whose field list can't be read is decided here, not in the
    // parser: it is still shown, naming no fields. The feed pages through time a page per
    // event type, so dropping an entry would push a valid one off the end of its page for
    // good. Anything else a row can't be read for, the table's constraints rule out, so it
    // throws rather than being hidden.
    const events = rows.map(
      ({ member_uuid: uuid, member_name: name, member_email: email, ...event }) => {
        const fields = StoredFieldList.safeParse(event.metafields);
        if (!fields.success) {
          logging.warn(
            {
              event: { name: 'members.metafields.change_event_unreadable' },
              err: fields.error,
              changeEventId: event.id,
            },
            'Reading an unreadable metafield change entry as naming no fields',
          );
        }
        return DbMetafieldChangeEventWithMember.parse({
          event: fields.success ? event : { ...event, metafields: StoredFieldList.encode([]) },
          member: { id: event.member_id, uuid, name, email },
        });
      },
    );

    return { events, total: Number(counted?.total ?? 0) };
  }
}
