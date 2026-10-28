import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import { z } from 'zod';
import {
  isRecordValue,
  matchShape,
  valueSchemaFor,
  type FieldType,
  type FieldValue,
  type MetafieldChangeEventField,
} from '@tryghost/metafield-types';
import {
  IdentityTextSchema,
  type Key,
  KeySchema,
  type Namespace,
  NamespaceSchema,
  QUALIFIER,
  SEPARATOR,
} from '@tryghost/metafield-types/identity';
import {
  DbMetafield,
  DbMetafieldChangeEventWithMember,
  DbStoredValueRow,
  DbMetafieldValue,
  FIELD_STATUS,
  StoredFieldList,
  type MetafieldChangeEvent,
  type SingleWriteOrigin,
  type WriteOrigin,
} from './schema';
import { toDatabaseDate } from '../../lib/db-types/date';
import type { MetafieldsTracking } from './tracking';
import {
  ACTIVE_ONLY,
  FIELDS_TABLE,
  fieldReference,
  knexify,
  onField,
  readableBy,
  type FieldIdentity,
  type FieldSource,
} from './queries';
import { canWrite, type Audience, type MemberAccess } from './access';
import { ROOT_PATH, valueRowsToWrite, valuesFromRows, type ValueRow } from './storage';

const VALUES_TABLE = 'members_metafield_values';
const CHANGE_EVENTS_TABLE = 'members_metafield_change_events';
const MEMBERS_TABLE = 'members';

/**
 * From the canonical schema, the same source definitions-service reads, so no key a site
 * could hold is refused and this cannot drift from the `members_metafields.key` column.
 */
const MAX_KEY_LENGTH: number = require('../../data/schema').tables[FIELDS_TABLE].key.maxlength;

/**
 * Rows per insert statement, bounded by knex rather than by either database. SQLite takes
 * a multi-row `VALUES` perfectly well; knex's SQLite dialect emits that form only for a
 * single row and compiles anything longer into `INSERT ... SELECT ? UNION ALL SELECT ?`,
 * which SQLite refuses past 500 terms.
 *
 * Open as knex#721 since 2015, with an approved but unmerged fix in knex#5780. This can
 * go when that lands; until then the alternative is hand-written upsert SQL per engine.
 */
const UPSERT_CHUNK = 400;

/** Derived, not restated, so a column changing shape in `schema.ts` changes here too. */
type DbValueRow = z.infer<typeof DbMetafieldValue>;

/**
 * The columns a value row is keyed by, from the canonical schema, so a write's conflict target
 * cannot fall behind the table's primary key. Only SQLite would notice if it did: MySQL ignores
 * a conflict target, and SQLite refuses one that names no key.
 */
const VALUE_KEY = z
  .array(DbMetafieldValue.keyof())
  .parse(require('../../data/schema').tables[VALUES_TABLE]['@@PRIMARY_KEY@@']);

const MAX_IDENTITY_LENGTH = MAX_KEY_LENGTH * 2 + 1;
const ValuesInput = z.record(z.string().max(MAX_IDENTITY_LENGTH), z.unknown());

const wireProperty = (identity: string): string => [QUALIFIER, identity].join(SEPARATOR);

/** One value the site will not accept, against the name the write gave it. */
interface Refusal {
  message: string;
  property: string;
}

/**
 * Every refusal in one error.
 *
 * The API renders a single error, so the first still fills `message` and `property` and
 * a client that reads only those sees exactly what it saw before. The whole set rides in
 * `errorDetails`, which the renderer already passes through as `details`, so a client
 * that wants to mark every refused input can have them all from one attempt.
 */
function refusalError(first: Refusal, rest: Refusal[]): errors.ValidationError {
  return new errors.ValidationError({
    message: first.message,
    property: first.property,
    // Omitted when there is nothing more to say, so the common single refusal keeps the
    // shape it has always had rather than growing a one-element list.
    ...(rest.length > 0 ? { errorDetails: [first, ...rest] } : {}),
  });
}

/** What a write needs of a field, decoded so its namespace and key arrive checked. */
const WritableField = DbMetafield.pick({
  id: true,
  name: true,
  type: true,
  member_access: true,
}).extend({ namespace: NamespaceSchema, key: KeySchema });

interface AllowedField {
  id: string;
  namespace: Namespace;
  key: Key;
  name: string;
  type: FieldType;
  memberAccess: MemberAccess;
}

/** An absent `value` means clear the field. */
export interface PlannedWrite {
  field: AllowedField;
  value?: FieldValue;
}

/** Checked writes and who is making them: everything needed to store them. */
export interface MetafieldPlan {
  writes: PlannedWrite[];
  origin: SingleWriteOrigin;
}

/**
 * Every value an import writes came out of its file, whichever column carried it. An import
 * has no id to give until its runs are stored with one, so it names its kind only.
 */
const IMPORTED: Extract<WriteOrigin, { source: 'import' }> = {
  writtenBy: { type: 'import', id: null },
  source: 'import',
};

/**
 * Whether a write of `raw` clears the whole field. The caller handles `null`, which clears any
 * field; `''` clears a scalar. For a record `''` names no part, so it goes on to fail validation
 * rather than being read as a delete.
 */
function clearsWhole(type: FieldType, raw: unknown): boolean {
  return matchShape(type, {
    scalar: () => raw === '',
    record: () => false,
  });
}

/**
 * What a field holds, read from its rows in the layout its type declares: a scalar's row at the
 * root, or a record's rows at its declared parts. Undefined when none of them is there. A row
 * anywhere else is left out, and `leftOut` is called. No write through this service stores one,
 * and a client couldn't draw it.
 *
 * The declared rows are read whatever else sits beside them, because a write names only declared
 * paths and so can never remove a stray row. Hiding a value for one would hide it for good,
 * however often staff saved the field again.
 *
 * Only the layout is checked, not the type's rule, so tightening a rule later never hides values
 * members already hold.
 */
function storedValueAs(type: FieldType, rows: readonly ValueRow[], leftOut: () => void): unknown {
  return matchShape<unknown>(type, {
    scalar: () => {
      const root = rows.find((row) => row.path === ROOT_PATH);
      if (rows.length > (root ? 1 : 0)) {
        leftOut();
      }
      return root?.value_text;
    },
    record: ({ parts }) => {
      const declared = rows.filter((row) => Object.prototype.hasOwnProperty.call(parts, row.path));
      if (declared.length < rows.length) {
        leftOut();
      }
      return declared.length > 0
        ? Object.fromEntries(declared.map((row) => [row.path, row.value_text]))
        : undefined;
    },
  });
}

/**
 * What a member holds for each defined field. Separate from the definitions service
 * because a value belongs to the member and a definition belongs to the site's settings,
 * which are different aggregates rather than different layers.
 */
export class MetafieldValuesService {
  private knex: Knex;
  private fields: FieldSource;
  /** A getter, not a number: the ceiling is an operator setting that changes between requests. */
  private getMaxDefinitions: () => number;
  private tracking: MetafieldsTracking;

  constructor({
    knex,
    fields,
    getMaxDefinitions,
    tracking,
  }: {
    knex: Knex;
    fields: FieldSource;
    getMaxDefinitions: () => number;
    tracking: MetafieldsTracking;
  }) {
    this.knex = knex;
    this.fields = fields;
    this.getMaxDefinitions = getMaxDefinitions;
    this.tracking = tracking;
  }

  // The query is scoped to the audience, so a field they may not see is absent from
  // the map and the caller reports it as unknown. Looking up unscoped and rejecting
  // afterwards would let a member tell a hidden field from an undefined one by the
  // reply they got.
  private async allowedFieldsByIdentity(
    identities: string[],
    audience: Audience,
  ): Promise<Map<string, AllowedField>> {
    // A write names whole fields, so an identity naming a part is one no field answers to.
    const keysByNamespace = new Map<Namespace, Key[]>();
    for (const text of identities) {
      const identity = z.safeDecode(IdentityTextSchema, text);
      if (identity.success && identity.data.parts.length === 0) {
        const { namespace, key } = identity.data;
        keysByNamespace.set(namespace, [...(keysByNamespace.get(namespace) ?? []), key]);
      }
    }
    if (keysByNamespace.size === 0) {
      return new Map();
    }
    const rows = await this.fields
      .definitions(this.knex, { audience, status: ACTIVE_ONLY })
      .where((query) => {
        for (const [namespace, keys] of keysByNamespace) {
          query.orWhere((inNamespace) =>
            inNamespace.where('namespace', namespace).whereIn('key', keys),
          );
        }
      })
      .select('id', 'namespace', 'key', 'name', 'type', 'member_access');

    const allowed = new Map<string, AllowedField>();
    for (const row of rows) {
      // Skipped rather than thrown, the way an unreadable value is: the write then reports
      // this one field as unknown instead of failing every other value it carries.
      const field = WritableField.safeParse(row);
      if (!field.success) {
        logging.warn(
          {
            event: { name: 'members.metafields.field_unreadable' },
            err: field.error,
            metafieldNamespace: row.namespace,
            metafieldKey: row.key,
          },
          'Skipping an unreadable metafield',
        );
        continue;
      }
      allowed.set(
        z.encode(IdentityTextSchema, {
          namespace: field.data.namespace,
          key: field.data.key,
          parts: [],
        }),
        {
          id: field.data.id,
          namespace: field.data.namespace,
          key: field.data.key,
          name: field.data.name,
          type: field.data.type,
          memberAccess: field.data.member_access,
        },
      );
    }
    return allowed;
  }

  /**
   * The member's metafields, or undefined if they have none. Given an executor, reads
   * inside that transaction.
   */
  async getValuesForMember(
    memberId: string,
    audience: Audience,
    executor: Knex = this.knex,
  ): Promise<Record<string, Record<string, unknown>> | undefined> {
    return (await this.getValuesForMembers([memberId], audience, executor)).get(memberId);
  }

  /**
   * Metafields for each member, keyed by member id. Only active fields the audience can
   * read are included. Members with no metafields have no entry. Given an executor, reads
   * inside that transaction.
   */
  async getValuesForMembers(
    memberIds: string[],
    audience: Audience,
    executor: Knex = this.knex,
  ): Promise<Map<string, Record<string, Record<string, unknown>>>> {
    if (memberIds.length === 0) {
      return new Map();
    }

    // Not ordered by field: these rows become an object keyed by field, and an object
    // cannot carry an order. `path` is ordered so composite parts assemble the same
    // way every time.
    const rows = await readableBy(
      executor(VALUES_TABLE).join(this.fields.table(executor), onField(FIELDS_TABLE, VALUES_TABLE)),
      audience,
    )
      .whereIn(`${VALUES_TABLE}.member_id`, memberIds)
      .where(`${FIELDS_TABLE}.status`, FIELD_STATUS.active)
      .orderBy(`${VALUES_TABLE}.path`, 'asc')
      .select(
        `${VALUES_TABLE}.member_id`,
        `${FIELDS_TABLE}.namespace`,
        `${FIELDS_TABLE}.key`,
        `${FIELDS_TABLE}.type`,
        `${VALUES_TABLE}.path`,
        `${VALUES_TABLE}.value_text`,
      );

    const stored: z.output<typeof DbStoredValueRow>[] = [];
    for (const row of rows) {
      try {
        stored.push(DbStoredValueRow.parse(row));
      } catch (err) {
        logging.warn(
          {
            event: { name: 'members.metafields.value_unreadable' },
            err,
            metafieldNamespace: row.namespace,
            metafieldKey: row.key,
            path: row.path,
          },
          'Skipping an unreadable metafield value',
        );
      }
    }

    // Counted per field and logged once, because one read can cover a whole list or export, and a
    // field with stray rows would otherwise log once per member.
    const misshapen = new Map<string, { namespace: string; key: string; members: number }>();
    const values = valuesFromRows(stored, ({ namespace, key, type }, fieldRows) =>
      storedValueAs(type, fieldRows, () => {
        const identity = [namespace, key].join(SEPARATOR);
        const counted = misshapen.get(identity) ?? { namespace, key, members: 0 };
        misshapen.set(identity, { ...counted, members: counted.members + 1 });
      }),
    );
    for (const { namespace, key, members } of misshapen.values()) {
      logging.warn(
        {
          event: { name: 'members.metafields.value_misshapen' },
          metafieldNamespace: namespace,
          metafieldKey: key,
          members,
        },
        'Skipping stored metafield rows that do not fit their type',
      );
    }
    return values;
  }

  private parseValues(input: unknown): Record<string, unknown> {
    const parsed = ValuesInput.safeParse(input);
    if (!parsed.success) {
      throw new errors.ValidationError({
        message: 'Custom field values must be an object keyed by field identity.',
        property: QUALIFIER,
      });
    }

    return parsed.data;
  }

  unwrapWire(input: unknown): unknown {
    if (input === undefined) {
      return undefined;
    }
    if (!isRecordValue(input)) {
      throw new errors.ValidationError({
        message: 'Metafields must be an object keyed by namespace.',
        property: QUALIFIER,
      });
    }
    const identified: Record<string, unknown> = {};
    for (const [namespace, values] of Object.entries(input)) {
      if (!isRecordValue(values)) {
        throw new errors.ValidationError({
          message: 'Metafield values must be an object keyed by field key.',
          property: [QUALIFIER, namespace].join(SEPARATOR),
        });
      }
      for (const [key, raw] of Object.entries(values)) {
        // Joined as text, not written by the codec: these segments are unchecked, and a write
        // naming a field that cannot exist is refused under the name it gave.
        identified[[namespace, key].join(SEPARATOR)] = raw;
      }
    }
    return identified;
  }

  /**
   * Resolve input into the writes it implies, writing nothing. Returned so a caller can
   * validate before opening a transaction it would otherwise have to unwind, then apply
   * the same plan without re-resolving it.
   */
  async planWrite(input: unknown, audience: Audience): Promise<PlannedWrite[]> {
    const values = this.parseValues(input);
    const identities = Object.keys(values);

    // Bounded by the definitions ceiling, which also holds the lookup below inside
    // the driver's bound-parameter limit.
    const maxKeys = this.getMaxDefinitions();
    if (identities.length > maxKeys) {
      throw new errors.ValidationError({
        message: `Custom field values are limited to ${maxKeys} fields per request.`,
        property: QUALIFIER,
      });
    }

    const byIdentity = await this.allowedFieldsByIdentity(identities, audience);
    const writes: PlannedWrite[] = [];
    // Gathered rather than thrown as they are found. A write names several values, and
    // a composite is several again, so refusing at the first leaves someone correcting
    // one part per round trip to learn what was wrong with the rest.
    const refusals: Refusal[] = [];

    for (const [identity, raw] of Object.entries(values)) {
      const field = byIdentity.get(identity);
      if (!field) {
        refusals.push({
          message: `Unknown custom field: ${identity}`,
          property: wireProperty(identity),
        });
        continue;
      }

      // A different refusal from the unknown-field one above: this audience can
      // already see the field, so naming it discloses nothing.
      if (!canWrite(audience, field)) {
        refusals.push({
          message: `Cannot set custom field: ${identity}`,
          property: wireProperty(identity),
        });
        continue;
      }

      if (raw === null || clearsWhole(field.type, raw)) {
        writes.push({ field });
        continue;
      }

      // Message only, no `context`: the API error handler moves a message into
      // `context` when `context` is empty and prepends it when it is not, so
      // anything added here reaches the client glued to the front of the reason.
      // Which field failed rides in `property`.
      const value = valueSchemaFor(field).safeParse(raw);
      if (!value.success) {
        // Every issue, not the first: a value with parts fails once per part, and each
        // names the part it belongs to, which is what lets a client mark them all.
        for (const issue of value.error.issues) {
          refusals.push({
            message: issue.message,
            property: [wireProperty(identity), ...issue.path].join(SEPARATOR),
          });
        }
        continue;
      }
      writes.push({ field, value: value.data });
    }

    const [first, ...rest] = refusals;
    if (first) {
      throw refusalError(first, rest);
    }

    return writes;
  }

  /**
   * Apply a plan from `planWrite`.
   *
   * A write touches the paths it names and nothing else, at every level: naming a path
   * with an empty value clears that part, naming the field with `null` clears all of
   * them, and saying nothing about a path leaves it alone. There is no whole-value
   * replace, so a caller that does not know about a field cannot erase it.
   *
   * `writtenBy` and `source` are required and have no default: every writer has to name
   * itself and where it wrote, so a new one cannot quietly inherit the identity of
   * whichever was written first.
   *
   * Always transactional. Given an executor it joins that transaction, so a failed value
   * write takes the member save it joined with it; given none it opens its own.
   *
   * Every write also puts an entry on the member's activity feed, naming the fields it
   * touched and who wrote them where, in the same transaction, so the feed cannot name a
   * change that was not stored or miss one that was. A value has more than one author,
   * and the feed is where a publisher finds out which of them changed it.
   *
   * Every write is reported to the metafields tracking, saying where it was made and whether it
   * was stored, so a dashboard can follow how each place saves values. A value `planWrite`
   * refuses never gets here: the refusal is answered to whoever wrote it.
   */
  async applyWrite(
    memberId: string,
    writes: PlannedWrite[],
    origin: SingleWriteOrigin & { executor?: Knex.Transaction },
  ): Promise<void> {
    if (writes.length === 0) {
      return;
    }
    const { executor } = origin;
    const stored = this.store(memberId, writes, origin, executor);

    // A write that joined the caller's transaction is only stored once that transaction
    // finishes without an error.
    this.tracking.valuesWrite(
      { source: origin.source, fields: writes.map(({ field }) => field) },
      executor ? stored.then(() => executor.executionPromise) : stored,
    );
    await stored;
  }

  /**
   * Stores the values from one row of a members import, joining the row's transaction so a
   * value that fails takes its member with it. The import records its run as a whole, so the
   * row's write is not reported to the tracking.
   */
  async applyImportedWrite(
    memberId: string,
    writes: PlannedWrite[],
    executor: Knex.Transaction,
  ): Promise<void> {
    if (writes.length === 0) {
      return;
    }
    await this.store(memberId, writes, IMPORTED, executor);
  }

  /** Stores a write and its activity feed entry, joining `executor`'s transaction if given. */
  private async store(
    memberId: string,
    writes: PlannedWrite[],
    { writtenBy, source }: WriteOrigin,
    executor: Knex.Transaction | undefined,
  ): Promise<void> {
    const apply = async (trx: Knex) => {
      // Built first, then sent as whole statements: a handful per member rather
      // than one per part, under one timestamp, because a write happened once
      // however many rows record it.
      const now = new Date();
      const clearedFields: FieldIdentity[] = [];
      const clearedPaths: Array<{ field: FieldIdentity; paths: string[] }> = [];
      const rows: DbValueRow[] = [];

      for (const { field, value } of writes) {
        if (value === undefined) {
          clearedFields.push(field);
          continue;
        }

        const { set, cleared } = valueRowsToWrite(value);
        if (cleared.length > 0) {
          clearedPaths.push({ field, paths: cleared });
        }

        rows.push(
          ...set.map((row): DbValueRow => ({
            ...fieldReference(field),
            member_id: memberId,
            path: row.path,
            value_text: row.value_text,
            written_by_type: writtenBy.type,
            written_by_id: writtenBy.id,
            created_at: now,
            updated_at: now,
          })),
        );
      }

      // One statement with a group per field, rather than a statement per field.
      if (clearedFields.length > 0) {
        await trx(VALUES_TABLE)
          .where('member_id', memberId)
          .where((builder) => {
            for (const field of clearedFields) {
              builder.orWhere((rowsOf) => rowsOf.where(fieldReference(field)));
            }
          })
          .del();
      }

      if (clearedPaths.length > 0) {
        await trx(VALUES_TABLE)
          .where('member_id', memberId)
          .where((builder) => {
            for (const { field, paths } of clearedPaths) {
              builder.orWhere((rowsOf) =>
                rowsOf.where(fieldReference(field)).whereIn('path', paths),
              );
            }
          })
          .del();
      }

      for (let from = 0; from < rows.length; from += UPSERT_CHUNK) {
        // Typed as the plain row because `merge` takes its columns as `keyof` the
        // builder's record, which for a composite table registration is the scope
        // names rather than the columns.
        await trx<DbValueRow>(VALUES_TABLE)
          .insert(rows.slice(from, from + UPSERT_CHUNK))
          // Naming the columns rather than giving values takes each from the row
          // that lost the conflict, so every part updates to its own value.
          .onConflict(VALUE_KEY)
          // The writer is merged with the value, so a row names who wrote what
          // it currently holds rather than who wrote its first value.
          .merge(['value_text', 'written_by_type', 'written_by_id', 'updated_at']);
      }

      const fields: MetafieldChangeEventField[] = writes.map(({ field }) => ({
        namespace: field.namespace,
        key: field.key,
        name: field.name,
      }));
      await trx(CHANGE_EVENTS_TABLE).insert({
        id: new ObjectID().toHexString(),
        member_id: memberId,
        written_by_type: writtenBy.type,
        written_by_id: writtenBy.id,
        source,
        metafields: StoredFieldList.encode(fields),
        // A string rather than the Date the value rows take: SQLite stores a bound Date
        // as a number, which sorts before every string the feed pages through time with.
        created_at: toDatabaseDate(now),
      });
    };

    // Joins the caller's transaction rather than nesting a savepoint under it.
    await (executor ? apply(executor) : this.knex.transaction(apply));
  }

  /**
   * Entries from members' activity feeds, newest first, each with its member, as one page
   * of the members events endpoint reads them.
   *
   * `filter` is a parsed NQL filter over this table's own columns: mapping the feed's
   * names onto them is the feed's business, and applying them is this table's.
   */
  async browseChangeEvents({
    limit,
    filter,
  }: {
    /** Absent for every entry, as the feed asks for when paging is off. */
    limit?: number;
    filter?: object;
  }): Promise<{ events: MetafieldChangeEvent[]; total: number }> {
    const filtered = () => {
      const query = this.knex(CHANGE_EVENTS_TABLE);
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
