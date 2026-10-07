import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import { z } from 'zod';
import {
  FIELD_TYPES,
  subFieldsOf,
  type FieldType,
  type MetafieldChangeEventField,
} from '@tryghost/metafield-types';
import {
  CUSTOM_NAMESPACE,
  QUALIFIER,
  formatIdentity,
  parseIdentity,
} from '@tryghost/metafield-types/identity';
import {
  DbMetafieldChangeEvent,
  DbMetafieldLeaf,
  DbMetafieldValue,
  FIELD_STATUS,
  StoredFieldList,
  type MetafieldChangeRecord,
  type WriteOrigin,
} from './schema';
import { toDatabaseDate } from '../../lib/db-types/date';
import { ACTIVE_ONLY, definitions, knexify, readableBy } from './queries';
import {
  SURFACES,
  accessFromColumns,
  canWrite,
  type Access,
  type AccessColumn,
  type Audience,
} from './access';
import { metafieldTables, type MetafieldEntity } from './entity';
import { leavesToWrite, valuesFromLeaves, type StoredLeaf } from './storage';

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
type DbLeafRow = z.infer<typeof DbMetafieldValue>;

/**
 * What a write may name, bounded by the key column in the canonical schema, the same
 * source definitions-service reads, so no key a site could hold is refused and this
 * cannot drift from the column.
 */
function valuesInputFor(entity: MetafieldEntity) {
  const maxKeyLength: number =
    require('../../data/schema').tables[metafieldTables(entity.table).definitions].key.maxlength;
  return z.record(z.string().max(maxKeyLength * 2 + 1), z.unknown());
}

const wireProperty = (identity: string): string => [QUALIFIER, identity].join('.');

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
function refusalError(refusals: Refusal[]): errors.ValidationError {
  const [first, ...rest] = refusals as [Refusal, ...Refusal[]];
  return new errors.ValidationError({
    message: first.message,
    property: first.property,
    // Omitted when there is nothing more to say, so the common single refusal keeps the
    // shape it has always had rather than growing a one-element list.
    ...(rest.length > 0 ? { errorDetails: refusals } : {}),
  });
}

interface AllowedField {
  id: string;
  namespace: string;
  key: string;
  name: string;
  type: FieldType;
  access: Access;
}

/** An absent `value` means clear the field. */
export interface PlannedWrite {
  field: AllowedField;
  value?: unknown;
}

/** Checked writes and who is making them: everything needed to store them. */
export interface MetafieldPlan {
  writes: PlannedWrite[];
  origin: WriteOrigin;
}

/** Columns of the entity's own table read alongside each history entry, and how they parse. */
export interface EntityColumns<T> {
  columns: readonly string[];
  /** Parses the columns named above, with the record's `id`. */
  schema: z.ZodType<T>;
}

/**
 * What a record holds for each defined field. Separate from the definitions service
 * because a value belongs to the record and a definition belongs to the site's settings,
 * which are different aggregates rather than different layers.
 */
export class MetafieldValuesService {
  private knex: Knex;
  private entity: MetafieldEntity;
  private tables: ReturnType<typeof metafieldTables>;
  private valuesInput: ReturnType<typeof valuesInputFor>;
  /** A getter, not a number: the ceiling is an operator setting that changes between requests. */
  private getMaxDefinitions: () => number;

  constructor({
    knex,
    entity,
    getMaxDefinitions,
  }: {
    knex: Knex;
    entity: MetafieldEntity;
    getMaxDefinitions: () => number;
  }) {
    this.knex = knex;
    this.entity = entity;
    this.tables = metafieldTables(entity.table);
    this.valuesInput = valuesInputFor(entity);
    this.getMaxDefinitions = getMaxDefinitions;
  }

  private get accessColumns(): AccessColumn[] {
    return this.entity.surfaces.map((surface) => SURFACES[surface].column);
  }

  // The query is scoped to the audience, so a field they may not see is absent from
  // the map and the caller reports it as unknown. Looking up unscoped and rejecting
  // afterwards would let a member tell a hidden field from an undefined one by the
  // reply they got.
  private async allowedFieldsByIdentity(
    identities: string[],
    audience: Audience,
  ): Promise<Map<string, AllowedField>> {
    const keys = identities
      .map((identity) => parseIdentity(identity))
      .filter((parsed) => parsed !== null && parsed.namespace === CUSTOM_NAMESPACE)
      .map((parsed) => (parsed as { key: string }).key);
    if (keys.length === 0) {
      return new Map();
    }
    const fields = await definitions(this.knex, this.entity, { audience, status: ACTIVE_ONLY })
      .whereIn('key', keys)
      .select('id', 'key', 'name', 'type', ...this.accessColumns);
    return new Map(
      fields.map((field) => [
        formatIdentity({ namespace: CUSTOM_NAMESPACE, key: field.key, partPath: null }),
        {
          id: field.id,
          key: field.key,
          name: field.name,
          type: field.type,
          namespace: CUSTOM_NAMESPACE,
          access: accessFromColumns(field),
        },
      ]),
    );
  }

  /**
   * The record's metafields, or undefined if it has none. Given an executor, reads
   * inside that transaction.
   */
  async getValues(
    entityId: string,
    audience: Audience,
    executor: Knex = this.knex,
  ): Promise<Record<string, Record<string, unknown>> | undefined> {
    return (await this.getValuesForMany([entityId], audience, executor)).get(entityId);
  }

  /**
   * Metafields for each record, keyed by its id. Only active fields the audience can
   * read are included. Records with no metafields have no entry. Given an executor, reads
   * inside that transaction.
   */
  async getValuesForMany(
    entityIds: string[],
    audience: Audience,
    executor: Knex = this.knex,
  ): Promise<Map<string, Record<string, Record<string, unknown>>>> {
    if (entityIds.length === 0) {
      return new Map();
    }

    const { values: valuesTable, definitions: fieldsTable } = this.tables;
    // Not ordered by field: these rows become an object keyed by field, and an object
    // cannot carry an order. `path` is ordered so composite parts assemble the same
    // way every time.
    const rows = await readableBy(
      executor(valuesTable).join(fieldsTable, `${valuesTable}.metafield_key`, `${fieldsTable}.key`),
      audience,
      this.entity,
    )
      .whereIn(`${valuesTable}.${this.entity.foreignKey}`, entityIds)
      .where(`${fieldsTable}.status`, FIELD_STATUS.active)
      .orderBy(`${valuesTable}.path`, 'asc')
      .select(
        { entity_id: `${valuesTable}.${this.entity.foreignKey}` },
        `${fieldsTable}.key`,
        `${fieldsTable}.type`,
        `${valuesTable}.path`,
        `${valuesTable}.value_text`,
      );

    const leaves: StoredLeaf[] = [];
    for (const row of rows) {
      try {
        leaves.push(DbMetafieldLeaf.parse(row));
      } catch (err) {
        logging.warn(
          {
            event: { name: `${this.entity.table}.metafields.value_unreadable` },
            err,
            metafieldKey: row.key,
            path: row.path,
          },
          'Skipping an unreadable metafield value',
        );
      }
    }

    return new Map(
      [...valuesFromLeaves(leaves)].map(([entityId, values]) => [
        entityId,
        { [CUSTOM_NAMESPACE]: values },
      ]),
    );
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
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new errors.ValidationError({
        message: 'Metafields must be an object keyed by namespace.',
        property: QUALIFIER,
      });
    }
    const identified: Record<string, unknown> = {};
    for (const [namespace, values] of Object.entries(input as Record<string, unknown>)) {
      if (typeof values !== 'object' || values === null || Array.isArray(values)) {
        throw new errors.ValidationError({
          message: 'Metafield values must be an object keyed by field key.',
          property: [QUALIFIER, namespace].join('.'),
        });
      }
      for (const [key, raw] of Object.entries(values as Record<string, unknown>)) {
        identified[`${namespace}.${key}`] = raw;
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

      // `null` clears any field, and `''` clears one with no parts. For a value
      // with parts `''` names nothing, so it is left to fail validation rather than
      // being read as a silent delete.
      if (raw === null || (raw === '' && subFieldsOf(field.type) === null)) {
        writes.push({ field });
        continue;
      }

      // Message only, no `context`: the API error handler moves a message into
      // `context` when `context` is empty and prepends it when it is not, so
      // anything added here reaches the client glued to the front of the reason.
      // Which field failed rides in `property`.
      const value = FIELD_TYPES[field.type].value.safeParse(raw);
      if (!value.success) {
        // Every issue, not the first: a value with parts fails once per part, and each
        // names the part it belongs to, which is what lets a client mark them all.
        for (const issue of value.error.issues) {
          refusals.push({
            message: issue.message,
            property: [wireProperty(identity), ...issue.path].join('.'),
          });
        }
        continue;
      }
      writes.push({ field, value: value.data });
    }

    if (refusals.length > 0) {
      throw refusalError(refusals);
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
   * Always transactional. Given an executor it joins that transaction, so the importer's
   * failed value write takes its member with it; given none it opens its own.
   *
   * Every write also puts an entry in the record's history, naming the fields it touched
   * and who wrote them where, in the same transaction, so the history cannot name a change
   * that was not stored or miss one that was. A value has more than one author, and the
   * history is where a publisher finds out which of them changed it.
   */
  async applyWrite(
    entityId: string,
    writes: PlannedWrite[],
    { writtenBy, source, executor = this.knex }: WriteOrigin & { executor?: Knex },
  ): Promise<void> {
    if (writes.length === 0) {
      return;
    }

    const { values, changeEvents } = this.tables;
    const { foreignKey } = this.entity;

    const apply = async (trx: Knex) => {
      // Built first, then sent as whole statements: a handful per member rather
      // than one per part, under one timestamp, because a write happened once
      // however many rows record it.
      const now = new Date();
      const clearedKeys: string[] = [];
      const clearedPaths: Array<{ fieldKey: string; paths: string[] }> = [];
      const rows: DbLeafRow[] = [];

      for (const { field, value } of writes) {
        if (value === undefined) {
          clearedKeys.push(field.key);
          continue;
        }

        const { set, cleared } = leavesToWrite(value);
        if (cleared.length > 0) {
          clearedPaths.push({ fieldKey: field.key, paths: cleared });
        }

        rows.push(
          ...set.map((leaf) => ({
            id: new ObjectID().toHexString(),
            [foreignKey]: entityId,
            metafield_key: field.key,
            path: leaf.path,
            value_text: leaf.value_text,
            written_by_type: writtenBy.type,
            written_by_id: writtenBy.id,
            created_at: now,
            updated_at: now,
          })),
        );
      }

      if (clearedKeys.length > 0) {
        await trx(values).where(foreignKey, entityId).whereIn('metafield_key', clearedKeys).del();
      }

      if (clearedPaths.length > 0) {
        // One statement with a group per field, rather than a statement per field.
        await trx(values)
          .where(foreignKey, entityId)
          .where((builder) => {
            for (const { fieldKey, paths } of clearedPaths) {
              builder.orWhere((pair) =>
                pair.where('metafield_key', fieldKey).whereIn('path', paths),
              );
            }
          })
          .del();
      }

      for (let from = 0; from < rows.length; from += UPSERT_CHUNK) {
        // Typed as the plain row because `merge` takes its columns as `keyof` the
        // builder's record, which for a composite table registration is the scope
        // names rather than the columns.
        await trx<DbLeafRow>(values)
          .insert(rows.slice(from, from + UPSERT_CHUNK))
          // Naming the columns rather than giving values takes each from the row
          // that lost the conflict, so every part updates to its own value.
          .onConflict([foreignKey, 'metafield_key', 'path'])
          // The writer is merged with the value, so a leaf names who wrote what
          // it currently holds rather than who wrote its first value.
          .merge(['value_text', 'written_by_type', 'written_by_id', 'updated_at']);
      }

      const fields: MetafieldChangeEventField[] = writes.map(({ field }) => ({
        namespace: field.namespace,
        key: field.key,
        name: field.name,
      }));
      await trx(changeEvents).insert({
        id: new ObjectID().toHexString(),
        [foreignKey]: entityId,
        written_by_type: writtenBy.type,
        written_by_id: writtenBy.id,
        source,
        metafields: StoredFieldList.encode(fields),
        // A string rather than the Date the value rows take: SQLite stores a bound Date
        // as a number, which sorts before every string the feed pages through time with.
        created_at: toDatabaseDate(now),
      });
    };

    // knex's marker for a transactor: join it rather than nesting a savepoint under it.
    if (executor.isTransaction) {
      await apply(executor);
    } else {
      await executor.transaction(apply);
    }
  }

  /**
   * Entries from records' histories, newest first, each with the columns of its record the
   * caller asks for, as one page of a feed reads them.
   *
   * `filter` is a parsed NQL filter over this table's own columns: mapping the feed's
   * names onto them is the feed's business, and applying them is this table's.
   */
  async browseChangeEvents<T>({
    limit,
    filter,
    entity,
  }: {
    /** Absent for every entry, as the feed asks for when paging is off. */
    limit?: number;
    filter?: object;
    entity: EntityColumns<T>;
  }): Promise<{ events: Array<MetafieldChangeRecord & { entity: T }>; total: number }> {
    const { changeEvents } = this.tables;
    const { table, foreignKey } = this.entity;
    const entityColumn = (column: string) => `entity_${column}`;

    const filtered = () => {
      const query = this.knex(changeEvents);
      return filter ? knexify(query, filter, { tableName: changeEvents }) : query;
    };

    // Joined rather than looked up afterwards: an entry cannot outlive its record, whose
    // delete cascades to it, so every entry has one to join.
    const newestFirst = filtered()
      .join(table, `${table}.id`, `${changeEvents}.${foreignKey}`)
      .orderBy([
        { column: `${changeEvents}.created_at`, order: 'desc' },
        { column: `${changeEvents}.id`, order: 'desc' },
      ]);
    const page = limit === undefined ? newestFirst : newestFirst.limit(limit);

    const [rows, counted] = await Promise.all([
      page.select(
        `${changeEvents}.id`,
        { entity_id: `${changeEvents}.${foreignKey}` },
        `${changeEvents}.written_by_type`,
        `${changeEvents}.written_by_id`,
        `${changeEvents}.source`,
        `${changeEvents}.metafields`,
        `${changeEvents}.created_at`,
        ...entity.columns.map((column) => ({ [entityColumn(column)]: `${table}.${column}` })),
      ),
      filtered().count({ total: '*' }).first(),
    ]);

    // What to do with an entry whose field list can't be read is decided here, not in the
    // parser: it is still shown, naming no fields. The feed pages through time a page per
    // event type, so dropping an entry would push a valid one off the end of its page for
    // good. Anything else a row can't be read for, the table's constraints rule out, so it
    // throws rather than being hidden.
    const events = rows.map((row: Record<string, unknown>) => {
      const fields = StoredFieldList.safeParse(row.metafields);
      if (!fields.success) {
        logging.warn(
          {
            event: { name: `${table}.metafields.change_event_unreadable` },
            err: fields.error,
            changeEventId: row.id,
          },
          'Reading an unreadable metafield change entry as naming no fields',
        );
      }
      const event = DbMetafieldChangeEvent.parse(
        fields.success ? row : { ...row, metafields: StoredFieldList.encode([]) },
      );
      const record = entity.schema.parse({
        id: event.entity_id,
        ...Object.fromEntries(entity.columns.map((column) => [column, row[entityColumn(column)]])),
      });
      return { ...event, entity: record };
    });

    return { events, total: Number(counted?.total ?? 0) };
  }
}
