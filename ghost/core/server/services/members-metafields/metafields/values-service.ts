import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import { z } from 'zod';
import {
  accept,
  isRecordValue,
  matchField,
  shaped,
  type AcceptedValue,
  type TypedSettings,
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
  DbStoredValueRow,
  DbMetafieldValue,
  FIELD_STATUS,
  StoredFieldList,
  storedField,
  DbMetafieldChangeEvent,
  type SingleWriteOrigin,
  type WriteOrigin,
} from './schema';
import schema from '../../../data/schema/schema';
import type { MetafieldsTracking } from './tracking';
import { toDatabaseDate } from '../../../lib/db-types/date';
import { ensureTransaction, transactionOf } from '../../../lib/ensure-transaction';
import {
  ACTIVE_ONLY,
  fieldReference,
  onField,
  type FieldIdentity,
  type FieldSource,
} from './queries';
import { MemberAccessSchema } from '@tryghost/metafield-types';
import type { Namespaces, RecordOf } from './namespaces';
import { accessOf } from './models';
import type { Asking } from './callers';
import { recordsAreMembers, type MetafieldResource, type ResourceKind } from './resource';
import { readStoredField } from './stored-fields';
import {
  VALUE_COLUMNS,
  heldOptionTexts,
  storedValueAs,
  valueRowsToWrite,
  valuesFromRows,
} from './storage';

/** One option a list field has been answered with: its path, and the text one of its rows holds. */
const HeldOptionRow = z.object({ path: z.string(), value_text: z.string() });

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
 * A change entry as it is written, except for the resource's id column: with its date already in
 * the string form SQLite orders against the feed's time filters, which a `Date` would silently
 * break.
 */
type ChangeEntryInsert = Omit<z.input<typeof DbMetafieldChangeEvent>, 'created_at'> & {
  created_at: string;
};

/**
 * A value row's key, as read to decide which rows a write removes: the field and path it is
 * checked by, and the rest of the key, including the id column, to name the row by.
 */
const HeldValueKey = DbMetafieldValue.pick({
  metafield_namespace: true,
  metafield_key: true,
  path: true,
}).catchall(z.unknown());

const wireProperty = (identity: string): string => [QUALIFIER, identity].join(SEPARATOR);

/** One value the site will not accept, against the name the write gave it. */
export interface Refusal {
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
export function refusalError(first: Refusal, rest: Refusal[]): errors.ValidationError {
  return new errors.ValidationError({
    message: first.message,
    property: first.property,
    // Omitted when there is nothing more to say, so the common single refusal keeps the
    // shape it has always had rather than growing a one-element list.
    ...(rest.length > 0 ? { errorDetails: [first, ...rest] } : {}),
  });
}

/**
 * What a write needs of a field, decoded so its namespace and key arrive checked, and its type
 * and settings read against each other.
 */
const WritableField = storedField({
  id: z.string(),
  namespace: NamespaceSchema,
  key: KeySchema,
  name: z.string(),
  memberAccess: MemberAccessSchema,
});

/** The column each of a writable field's values is read from, keyed so none is left out. */
const WRITABLE_FIELD_COLUMNS = {
  id: 'id',
  namespace: 'namespace',
  key: 'key',
  name: 'name',
  memberAccess: 'member_access',
  type: 'type',
  settings: 'settings',
} satisfies Record<keyof z.input<typeof WritableField.asStored>, string>;

/** A field's identity with its type and settings, for reading its values. */
const DbTypedField = storedField({ namespace: NamespaceSchema, key: KeySchema });

/** The columns of a field's identity, type and settings, keyed so none is left out. */
const TYPED_FIELD_COLUMNS = Object.keys({
  namespace: true,
  key: true,
  type: true,
  settings: true,
} satisfies Record<keyof z.input<typeof DbTypedField.asStored>, true>);

/**
 * The columns of the joined read of values, each as `values` and `fields` name it. Keyed by the
 * row it is parsed as, so a column the row reads can't be left out of the select. The id column
 * is read as `resource_id`, whatever it is called.
 */
function storedValueColumns(resource: MetafieldResource, fields: string) {
  const values = resource.tables.values;
  return {
    resource_id: `${values}.${resource.idColumn}`,
    namespace: `${fields}.namespace`,
    key: `${fields}.key`,
    type: `${fields}.type`,
    path: `${values}.path`,
    value_text: `${values}.value_text`,
  } satisfies Record<keyof z.input<typeof DbStoredValueRow>, string>;
}

type AllowedField = z.output<typeof WritableField.asStored>;

/** An absent `accepted` means clear the field. */
export interface PlannedWrite {
  field: AllowedField;
  accepted?: AcceptedValue;
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
 * What each member or post holds for each defined field, for one resource. Separate from the
 * definitions service because a value belongs to its member or post and a definition belongs to
 * the site's settings, which are different aggregates rather than different layers.
 */
export class MetafieldValuesService<R extends ResourceKind> {
  protected knex: Knex;
  protected resource: MetafieldResource<R>;
  private fields: FieldSource;
  private namespaces: Pick<Namespaces, 'canWrite'>;
  /** A getter, not a number: the ceiling is an operator setting that changes between requests. */
  private getMaxDefinitions: () => number;
  private tracking: MetafieldsTracking;
  /**
   * The columns a value row is keyed by, from the canonical schema, so a write's conflict target
   * cannot fall behind the table's primary key. Only SQLite would notice if it did: MySQL ignores
   * a conflict target, and SQLite refuses one that names no key.
   */
  private valueKey: string[];
  private valuesInput: z.ZodType<Record<string, unknown>>;
  /** Whether a member owns a record: on members, the record is the member. */
  private memberOf: (resourceId: string) => string | null;

  constructor({
    knex,
    resource,
    fields,
    namespaces,
    getMaxDefinitions,
    tracking,
  }: {
    knex: Knex;
    resource: MetafieldResource<R>;
    fields: FieldSource;
    /** Whose grant decides what a caller may write, namespace by namespace. */
    namespaces: Pick<Namespaces, 'canWrite'>;
    getMaxDefinitions: () => number;
    tracking: MetafieldsTracking;
  }) {
    this.knex = knex;
    this.resource = resource;
    this.fields = fields;
    this.namespaces = namespaces;
    this.getMaxDefinitions = getMaxDefinitions;
    this.tracking = tracking;

    this.valueKey = z
      .object({
        '@@PRIMARY_KEY@@': z.array(
          z.union([DbMetafieldValue.keyof(), z.literal(resource.idColumn)]),
        ),
      })
      .parse(schema[resource.tables.values])['@@PRIMARY_KEY@@'];
    const ofMembers = recordsAreMembers(resource);
    this.memberOf = (resourceId) => (ofMembers ? resourceId : null);
    // From the fields table's `key` column, so no key a site could hold is rejected.
    this.valuesInput = z.record(z.string().max(fields.maxLength.key * 2 + 1), z.unknown());
  }

  // The query is scoped to the caller, so a field they may not see is absent from
  // the map and the caller reports it as unknown. Looking up unscoped and rejecting
  // afterwards would let a member tell a hidden field from an undefined one by the
  // reply they got.
  private async allowedFieldsByIdentity(
    executor: Knex,
    identities: string[],
    caller: Asking,
    record: RecordOf,
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
    const rows = await (
      await this.fields.definitions(executor, { caller, status: ACTIVE_ONLY, record })
    ).read
      .where((query: Knex.QueryBuilder) => {
        for (const [namespace, keys] of keysByNamespace) {
          query.orWhere((inNamespace: Knex.QueryBuilder) =>
            inNamespace.where('namespace', namespace).whereIn('key', keys),
          );
        }
      })
      .select(WRITABLE_FIELD_COLUMNS);

    const allowed = new Map<string, AllowedField>();
    for (const row of rows) {
      // A field that can't be read even with its type's defaults is skipped rather than thrown, the
      // way an unreadable value is: the write then reports this one field as unknown instead of
      // failing every other value it carries.
      const field = readStoredField(row, WritableField, {
        reader: 'values',
        tracking: this.tracking,
      });
      if (!field) {
        continue;
      }
      allowed.set(
        z.encode(IdentityTextSchema, {
          namespace: field.namespace,
          key: field.key,
          parts: [],
        }),
        field,
      );
    }
    return allowed;
  }

  /**
   * One member's or post's metafields, or undefined if it has none. Given an executor, reads inside that
   * transaction.
   */
  async getValuesFor(
    resourceId: string,
    caller: Asking,
    executor: Knex = this.knex,
  ): Promise<Record<string, Record<string, unknown>> | undefined> {
    return (await this.getValuesForMany([resourceId], caller, executor)).get(resourceId);
  }

  /**
   * The type and settings of each active field the caller can read, keyed by identity. A field
   * whose settings can't be read is read with its type's defaults, and one that can't be read even
   * so is left out, and its values with it.
   */
  private async typedFields(executor: Knex, caller: Asking): Promise<Map<string, TypedSettings>> {
    const rows = await (
      await this.fields.definitions(executor, { caller, status: ACTIVE_ONLY })
    ).read.select(...TYPED_FIELD_COLUMNS);
    const typedFields = new Map<string, TypedSettings>();
    for (const row of rows) {
      const field = readStoredField(row, DbTypedField, {
        reader: 'values',
        tracking: this.tracking,
      });
      if (field) {
        typedFields.set([field.namespace, field.key].join(SEPARATOR), field);
      }
    }
    return typedFields;
  }

  /**
   * Metafields for each member or post, keyed by its id. Only active fields the caller can read are
   * included. One with no metafields has no entry. Given an executor, reads inside that
   * transaction.
   */
  async getValuesForMany(
    resourceIds: string[],
    caller: Asking,
    executor: Knex = this.knex,
  ): Promise<Map<string, Record<string, Record<string, unknown>>>> {
    if (resourceIds.length === 0) {
      return new Map();
    }
    // A member reaches a record as its member only when it is theirs, so their own record is read
    // apart from any other.
    if (caller.kind === 'member' && 'memberId' in caller) {
      const own = resourceIds.filter((id) => this.memberOf(id) === caller.memberId);
      const others = resourceIds.filter((id) => this.memberOf(id) !== caller.memberId);
      if (own.length > 0 && others.length > 0) {
        const [ofOwn, ofOthers] = await Promise.all([
          this.getValuesForMany(own, caller, executor),
          this.getValuesForMany(others, caller, executor),
        ]);
        return new Map([...ofOwn, ...ofOthers]);
      }
    }
    // Every id here is the caller's own record or none is, so one record stands for them all.
    const [first] = resourceIds;
    const record = { member: first === undefined ? null : this.memberOf(first) };

    // Not ordered by field: these rows become an object keyed by field, and an object
    // cannot carry an order. `path` is ordered so composite parts assemble the same
    // way every time.
    const valuesTable = this.resource.tables.values;
    const readable = await this.fields.readableFields(executor, caller, record);
    const rows = await this.fields
      .readable(
        executor(valuesTable).join(
          this.fields.asRead(executor),
          onField(this.fields.name, valuesTable),
        ),
        readable,
      )
      .whereIn(`${valuesTable}.${this.resource.idColumn}`, resourceIds)
      .where(`${this.fields.name}.status`, FIELD_STATUS.active)
      .orderBy(`${valuesTable}.path`, 'asc')
      .select(storedValueColumns(this.resource, this.fields.name));

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

    // Each field's type and settings are read once, from its definition, rather than beside every
    // row: a list's settings would otherwise come back once for every answer, and one read can
    // cover a whole list or export.
    const typedFields = stored.length > 0 ? await this.typedFields(executor, caller) : new Map();
    const typedField = ({ namespace, key }: (typeof stored)[number]) =>
      typedFields.get([namespace, key].join(SEPARATOR)) ?? null;

    // Counted per field and logged once, because one read can cover a whole list or export, and a
    // field with stray rows would otherwise log once per member.
    const misshapen = new Map<string, { namespace: string; key: string; members: number }>();
    const values = valuesFromRows(stored, (row, fieldRows) => {
      const field = typedField(row);
      return field
        ? storedValueAs(field, fieldRows, () => {
            const identity = [row.namespace, row.key].join(SEPARATOR);
            const counted = misshapen.get(identity) ?? {
              namespace: row.namespace,
              key: row.key,
              members: 0,
            };
            misshapen.set(identity, { ...counted, members: counted.members + 1 });
          })
        : undefined;
    });
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
    const parsed = this.valuesInput.safeParse(input);
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
   * Resolve input into the writes it implies on the record `resourceId` names, writing nothing,
   * or on a record still to be added when it names none. Returned so a caller can validate before
   * opening a transaction it would otherwise have to unwind, then apply the same plan to that
   * record without re-resolving it. A value the site won't accept refuses the whole write, with
   * every refusal at once.
   */
  async planWrite(
    input: unknown,
    caller: Asking,
    resourceId: string | null,
    executor: Knex = this.knex,
  ): Promise<PlannedWrite[]> {
    const { writes, refusals } = await this.planOrRefuse(
      input,
      caller,
      resourceId,
      undefined,
      executor,
    );
    const [first, ...rest] = refusals;
    if (first) {
      throw refusalError(first, rest);
    }
    return writes;
  }

  /**
   * Resolve input into the writes for the values the site accepts, and what it refuses of the
   * rest, writing nothing, for a caller that saves what it can or decides for itself what a
   * refusal means. A write that can't be planned at all, such as one naming too many fields,
   * still throws.
   *
   * A refusal names the value it refuses the way the API's body names it,
   * `metafields.<namespace>.<key>`. A caller that took the value under another name, such as a
   * port, passes `named`, given the value's identity, and every refusal names the value that way
   * instead, in its property and its message, so a client is told about what it sent rather than
   * about a field it may not know of.
   */
  async planOrRefuse(
    input: unknown,
    caller: Asking,
    resourceId: string | null,
    named?: (identity: string) => string,
    executor: Knex = this.knex,
  ): Promise<{ writes: PlannedWrite[]; refusals: Refusal[] }> {
    const propertyOf = named ?? wireProperty;
    const nameOf = named ?? ((identity: string) => identity);
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

    // A record still to be added belongs to no member yet, so no member's own policy reaches it.
    const record = { member: resourceId === null ? null : this.memberOf(resourceId) };
    const byIdentity = await this.allowedFieldsByIdentity(executor, identities, caller, record);
    const writes: PlannedWrite[] = [];
    // Gathered rather than thrown as they are found. A write names several values, and
    // a composite is several again, so refusing at the first leaves someone correcting
    // one part per round trip to learn what was wrong with the rest.
    const refusals: Refusal[] = [];

    for (const [identity, raw] of Object.entries(values)) {
      const field = byIdentity.get(identity);
      if (!field) {
        refusals.push({
          message: `Unknown custom field: ${nameOf(identity)}`,
          property: propertyOf(identity),
        });
        continue;
      }

      // A different refusal from the unknown-field one above: this caller can
      // already see the field, so naming it discloses nothing.
      if (
        !this.namespaces.canWrite(
          caller,
          { namespace: field.namespace, access: accessOf(field.memberAccess) },
          record,
        )
      ) {
        refusals.push({
          message: `Cannot set custom field: ${nameOf(identity)}`,
          property: propertyOf(identity),
        });
        continue;
      }

      // `null` clears any field; any other value, `''` and `[]` included, must pass the field's rule.
      if (raw === null) {
        writes.push({ field });
        continue;
      }

      // Message only, no `context`: the API error handler moves a message into
      // `context` when `context` is empty and prepends it when it is not, so
      // anything added here reaches the client glued to the front of the reason.
      // Which field failed rides in `property`.
      const acceptance = accept(shaped(field), raw);
      if (!acceptance.success) {
        // Every issue, not the first: a value with parts fails once per part, and each
        // names the part it belongs to, which is what lets a client mark them all.
        for (const issue of acceptance.issues) {
          refusals.push({
            message: issue.message,
            property: [propertyOf(identity), ...issue.path].join(SEPARATOR),
          });
        }
        continue;
      }
      writes.push({ field, accepted: acceptance.accepted });
    }

    return { writes, refusals };
  }

  /**
   * Apply a plan from `planWrite`.
   *
   * A write touches the paths it names and nothing else, at every level: naming a part
   * as `null` clears that part, naming the field as `null` clears all of them, and saying
   * nothing about a path leaves it alone, so a caller that does not know
   * about a field cannot erase it. A list is the one value replaced whole: the options a
   * write picks are all it holds afterwards.
   *
   * `writtenBy` and `source` are required and have no default: every writer has to name
   * itself and where it wrote, so a new one cannot quietly inherit the identity of
   * whichever was written first.
   *
   * Always transactional. Given a transaction as `executor` it joins that transaction, so a
   * failed value write takes the member save it joined with it; given a plain connection it
   * opens its own.
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
    resourceId: string,
    writes: PlannedWrite[],
    origin: SingleWriteOrigin,
    executor: Knex = this.knex,
  ): Promise<void> {
    if (writes.length === 0) {
      return;
    }
    const stored = ensureTransaction(executor, (trx) =>
      this.store(trx, resourceId, writes, origin),
    );

    // A write that joined the caller's transaction is only stored once that transaction
    // finishes without an error.
    const joined = transactionOf(executor);
    this.tracking.valuesWrite(
      { source: origin.source, fields: writes.map(({ field }) => field) },
      joined ? stored.then(() => joined.executionPromise) : stored,
    );
    await stored;
  }

  /**
   * Stores the values from one row of an import. Given the row's transaction as `executor` it
   * joins that transaction, so a value that fails takes the imported row with it; given
   * a plain connection it opens its own. The import records its run as a whole, so the row's
   * write is not reported to the tracking.
   */
  async applyImportedWrite(
    resourceId: string,
    writes: PlannedWrite[],
    executor: Knex = this.knex,
  ): Promise<void> {
    if (writes.length === 0) {
      return;
    }
    await ensureTransaction(executor, (trx) => this.store(trx, resourceId, writes, IMPORTED));
  }

  /**
   * Stores a write inside `trx`, and reports it there.
   *
   * The existing values are read without a lock. On MySQL that read sees the database as it was
   * when the transaction first read anything without a lock, so it can miss values another
   * request saved to the same member or post since then. Code that may save a member or post
   * while another request saves the same one must lock its row before reading anything, as the
   * member edit does. The second save then waits for the first, and reads the values it saved.
   */
  private async store(
    trx: Knex.Transaction,
    resourceId: string,
    writes: PlannedWrite[],
    origin: WriteOrigin,
  ): Promise<void> {
    const { writtenBy } = origin;
    const { tables, idColumn } = this.resource;
    // Built first, then sent as whole statements: a handful per write rather
    // than one per part, under one timestamp, because a write happened once
    // however many rows record it. Rows are removed one statement each, for
    // the reasons given where they are.
    const now = new Date();
    // The fields this write deletes rows from, each with a check on a row's path that says
    // whether to delete that row.
    const removals: Array<{ field: FieldIdentity; removes: (path: string) => boolean }> = [];
    const rows: DbValueRow[] = [];

    for (const { field, accepted } of writes) {
      if (accepted === undefined) {
        removals.push({ field, removes: () => true });
        continue;
      }

      const toWrite = valueRowsToWrite(accepted);
      const { set } = toWrite;
      switch (toWrite.mode) {
        // A set is replaced as a whole. Rows for options the new set no longer picks are
        // deleted, while rows for options it still picks are kept, along with when they were
        // first picked.
        case 'replace': {
          const kept = new Set(set.map((row) => row.path));
          removals.push({ field, removes: (path) => !kept.has(path) });
          break;
        }
        case 'merge':
          if (toWrite.cleared.length > 0) {
            const cleared = new Set(toWrite.cleared);
            removals.push({ field, removes: (path) => cleared.has(path) });
          }
          break;
      }

      rows.push(
        ...set.map(({ path, ...columns }): DbValueRow => ({
          ...fieldReference(field),
          [idColumn]: resourceId,
          path,
          ...columns,
          written_by_type: writtenBy.type,
          written_by_id: writtenBy.id,
          created_at: now,
          updated_at: now,
        })),
      );
    }

    for (let from = 0; from < rows.length; from += UPSERT_CHUNK) {
      // Typed as the plain row because `merge` takes its columns as `keyof` the
      // builder's record, which for a composite table registration is the scope
      // names rather than the columns.
      await trx<DbValueRow>(tables.values)
        .insert(rows.slice(from, from + UPSERT_CHUNK))
        // Naming the columns rather than giving values takes each from the row
        // that lost the conflict, so every part updates to its own value.
        .onConflict(this.valueKey)
        // The writer is merged with the value, so a row names who wrote what
        // it currently holds rather than who wrote its first value.
        .merge([...VALUE_COLUMNS, 'written_by_type', 'written_by_id', 'updated_at']);
    }

    // Rows are removed after the rows above are written, with one DELETE per row that names
    // the row by its primary key. On MySQL, at its default isolation level:
    //
    // - A DELETE that searches also locks the stretch of the index it searched through, even
    //   when it finds no rows. New members get IDs that sort next to each other, so two
    //   members created at once would lock the same stretch, then each wait for the other's
    //   lock to insert its own values there, until MySQL cancels one of the requests.
    // - MySQL can run a DELETE that names many rows as a scan of the whole table, once those
    //   rows are a large share of it, and the scan locks every row in the table.
    // - A DELETE of one row locks that row, and can also lock the end of an index page next
    //   to it. Deleting after the inserts means a write takes those locks after its last
    //   insert into this table, so it doesn't wait for another write while it holds them,
    //   unless its transaction writes values again.
    //
    // The rows written above are never ones removed here: a write sets and clears different
    // parts of a field.
    if (removals.length > 0) {
      const heldRows = await trx(tables.values)
        .select(this.valueKey)
        .where(idColumn, resourceId)
        .where((builder) => {
          for (const { field } of removals) {
            builder.orWhere((rowsOf) => rowsOf.where(fieldReference(field)));
          }
        });
      const held = z.array(HeldValueKey).parse(heldRows);
      const removed = held.filter((row) =>
        removals.some(
          ({ field, removes }) =>
            row.metafield_namespace === field.namespace &&
            row.metafield_key === field.key &&
            removes(row.path),
        ),
      );
      for (const row of removed) {
        await trx(tables.values)
          .where(Object.fromEntries(this.valueKey.map((column) => [column, row[column]])))
          .del();
      }
    }

    // Each write is an entry in the record's history of its values, written in the same
    // transaction, so the history can't name a change that wasn't stored or miss one that was.
    const entry: ChangeEntryInsert = {
      id: new ObjectID().toHexString(),
      written_by_type: writtenBy.type,
      written_by_id: writtenBy.id,
      source: origin.source,
      metafields: StoredFieldList.encode(
        writes.map(({ field }) => ({
          namespace: field.namespace,
          key: field.key,
          name: field.name,
        })),
      ),
      // A string rather than the Date the value rows take: SQLite stores a bound Date as a number,
      // which sorts before every string the history pages through time with.
      created_at: toDatabaseDate(now),
    };
    await trx(tables.changes).insert({ ...entry, [idColumn]: resourceId });
  }

  /**
   * The text of every option held for a list field, whether or not the field still offers
   * it, sorted by text. The members filter offers them all, so a publisher can find who answered
   * with an option after it was removed. A field that isn't a list is refused, and one that doesn't
   * exist, or can't be read even with its type's defaults, is not found.
   *
   * Only an active field's values are read, as the filter offers only active fields. An archived
   * field is not found, and so is every field while the host switches custom fields off, since they
   * all read as archived then, so this read gives nothing the switched-off filter doesn't offer.
   *
   * Read from the table's key: each option a field has been answered with is one path, and every row
   * under a path holds the same text, so one row is read for each.
   */
  async heldValues(
    field: FieldIdentity,
    caller: Asking,
    executor: Knex = this.knex,
  ): Promise<string[]> {
    const values = this.resource.tables.values;
    const [row] = await (
      await this.fields.definitions(executor, { caller, status: ACTIVE_ONLY, field })
    ).read.select(...TYPED_FIELD_COLUMNS);
    // A field that can't be read even with its type's defaults is treated as missing, as the
    // definitions read treats it.
    const typed =
      row === undefined
        ? null
        : readStoredField(row, DbTypedField, { reader: 'values', tracking: this.tracking });
    if (!typed) {
      throw new errors.NotFoundError({ message: 'Custom field not found.' });
    }
    const notAList = (): never => {
      throw new errors.ValidationError({
        message: "Only a list field's values can be read.",
        property: 'key',
      });
    };
    return matchField<TypedSettings, Promise<string[]>>(typed, {
      scalar: notAList,
      record: notAList,
      set: async () => {
        const held = executor(values).distinct('path').where(fieldReference(field)).as('held');
        const rows = await executor.from(held).select('held.path', {
          value_text: executor(values)
            .select('value_text')
            .where(fieldReference(field))
            .whereRaw('?? = ??', [`${values}.path`, 'held.path'])
            .limit(1),
        });
        return heldOptionTexts(z.array(HeldOptionRow).parse(rows));
      },
    });
  }
}
