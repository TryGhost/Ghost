import ObjectID from 'bson-objectid';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import { toDatabaseDate } from '../../lib/db-types/date';
import { DbMetafieldChangeEventWithMember, type MetafieldChangeEvent } from './members-resource';
import type { ValuesWritten } from './metafields/changes';
import { knexify } from './metafields/queries';
import { StoredFieldList } from './metafields/schema';

const MEMBERS_TABLE = 'members';
const CHANGE_EVENTS_TABLE = 'members_metafield_change_events';

/**
 * The activity feed members' metafield writes leave: an entry for each write, naming the fields
 * it wrote and who wrote them. A write of a member's values is a change to the member, so it is
 * recorded here, in the write's transaction, and read with each entry's member.
 */
export class MemberMetafieldActivity {
  private knex: Knex;

  constructor({ knex }: { knex: Knex }) {
    this.knex = knex;
  }

  /** Records a write as an entry on its member's feed, inside the write's transaction. */
  record = async (trx: Knex.Transaction, change: ValuesWritten): Promise<void> => {
    await trx(CHANGE_EVENTS_TABLE).insert({
      id: new ObjectID().toHexString(),
      member_id: change.resourceId,
      written_by_type: change.origin.writtenBy.type,
      written_by_id: change.origin.writtenBy.id,
      source: change.origin.source,
      metafields: StoredFieldList.encode(change.fields),
      // A string rather than the Date the value rows take: SQLite stores a bound Date
      // as a number, which sorts before every string the feed pages through time with.
      created_at: toDatabaseDate(change.at),
    });
  };

  /**
   * Entries from members' activity feeds, newest first, each with its member, as one page
   * of the members events endpoint reads them.
   *
   * `filter` is a parsed NQL filter over this table's own columns: mapping the feed's
   * names onto them is the feed's business, and applying them is this table's.
   */
  async browse(
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
