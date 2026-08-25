import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import { z } from 'zod';
import { FIELD_TYPES, subFieldsOf, type FieldType } from '@tryghost/custom-field-types';
import { DbCustomFieldLeaf, DbCustomFieldValue, FIELD_STATUS } from './schema';
import { activeFields } from './queries';
import { leavesToWrite, valuesFromLeaves, type StoredLeaf } from './storage';

const FIELDS_TABLE = 'members_custom_fields';
const VALUES_TABLE = 'members_custom_field_values';

/**
 * From the canonical schema, the same source definitions-service reads, so no key a site
 * could hold is refused and this cannot drift from the `members_custom_fields.key` column.
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
type DbLeafRow = z.infer<typeof DbCustomFieldValue>;

// Values stay `unknown`: each is validated by its own field type, which is not known
// until the key is resolved to a definition.
const ValuesInput = z.record(z.string().max(MAX_KEY_LENGTH), z.unknown());

interface ActiveField {
  id: string;
  key: string;
  name: string;
  type: FieldType;
}

/** An absent `value` means clear the field. */
interface PlannedWrite {
  field: ActiveField;
  value?: unknown;
}

/**
 * What a member holds for each defined field. Separate from the definitions service
 * because a value belongs to the member and a definition belongs to the site's settings,
 * which are different aggregates rather than different layers.
 */
export class CustomFieldValuesService {
  private knex: Knex;
  /** A getter, not a number: the ceiling is an operator setting that changes between requests. */
  private getMaxDefinitions: () => number;

  constructor({ knex, getMaxDefinitions }: { knex: Knex; getMaxDefinitions: () => number }) {
    this.knex = knex;
    this.getMaxDefinitions = getMaxDefinitions;
  }

  private async activeFieldsByKey(keys: string[]): Promise<Map<string, ActiveField>> {
    if (keys.length === 0) {
      return new Map();
    }
    const fields = await activeFields(this.knex)
      .whereIn('key', keys)
      .select('id', 'key', 'name', 'type');
    return new Map(fields.map((field) => [field.key, field]));
  }

  /**
   * Members' values, keyed by member id then field key; anything absent is unset.
   *
   * Archived fields are excluded to match the definitions browse: their values stay in
   * the database and stop being addressable. A row that will not parse is dropped and
   * logged rather than failing the read, so one stale row cannot take down a member.
   */
  async getValuesForMembers(memberIds: string[]): Promise<Map<string, Record<string, unknown>>> {
    if (memberIds.length === 0) {
      return new Map();
    }

    // Not ordered by field: these rows become an object keyed by field, and an object
    // cannot carry an order. `path` is ordered so composite parts assemble the same
    // way every time.
    const rows = await this.knex(VALUES_TABLE)
      .join(FIELDS_TABLE, `${VALUES_TABLE}.custom_field_key`, `${FIELDS_TABLE}.key`)
      .whereIn(`${VALUES_TABLE}.member_id`, memberIds)
      .where(`${FIELDS_TABLE}.status`, FIELD_STATUS.active)
      .orderBy(`${VALUES_TABLE}.path`, 'asc')
      .select(
        `${VALUES_TABLE}.member_id`,
        `${FIELDS_TABLE}.key`,
        `${FIELDS_TABLE}.type`,
        `${VALUES_TABLE}.path`,
        `${VALUES_TABLE}.value_text`,
      );

    const leaves: StoredLeaf[] = [];
    for (const row of rows) {
      try {
        leaves.push(DbCustomFieldLeaf.parse(row));
      } catch (err) {
        logging.warn(
          `Skipping unreadable custom field value (field '${row.key}', path '${row.path}'): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return valuesFromLeaves(leaves);
  }

  /** Shared by every caller so they cannot disagree on what a values object is. */
  private parseValues(input: unknown): Record<string, unknown> {
    const parsed = ValuesInput.safeParse(input);
    if (!parsed.success) {
      throw new errors.ValidationError({
        message: 'Custom field values must be an object keyed by field key.',
        property: 'custom_fields',
      });
    }

    return parsed.data;
  }

  /**
   * Whether input names any values. Asks the shape question alone, with no catalog
   * lookup, so it can be asked before a write is known to be permitted.
   */
  namesValues(input: unknown): boolean {
    if (input === undefined) {
      return false;
    }

    return Object.keys(this.parseValues(input)).length > 0;
  }

  /**
   * Resolve input into the writes it implies, writing nothing. Returned so a caller can
   * validate before opening a transaction it would otherwise have to unwind, then apply
   * the same plan without re-resolving it.
   */
  async planWrite(input: unknown): Promise<PlannedWrite[]> {
    const values = this.parseValues(input);
    const keys = Object.keys(values);

    // Bounded by the definitions ceiling, which also holds the lookup below inside
    // the driver's bound-parameter limit.
    const maxKeys = this.getMaxDefinitions();
    if (keys.length > maxKeys) {
      throw new errors.ValidationError({
        message: `Custom field values are limited to ${maxKeys} fields per request.`,
        property: 'custom_fields',
      });
    }

    const byKey = await this.activeFieldsByKey(keys);
    const writes: PlannedWrite[] = [];

    for (const [key, raw] of Object.entries(values)) {
      const field = byKey.get(key);
      if (!field) {
        // Unknown or archived. Refused rather than ignored: a typo that silently
        // drops what somebody typed is worse than a save that fails. The catalog
        // applies the same rule to the parts of a composite value.
        throw new errors.ValidationError({
          message: `Unknown custom field: ${key}`,
          property: `custom_fields.${key}`,
        });
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
        const issue = value.error.issues[0];
        throw new errors.ValidationError({
          message: issue.message,
          property: [`custom_fields.${key}`, ...issue.path].join('.'),
        });
      }
      writes.push({ field, value: value.data });
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
   * Always transactional. Given an executor it joins that transaction, so the importer's
   * failed value write takes its member with it; given none it opens its own.
   */
  async applyWrite(
    memberId: string,
    writes: PlannedWrite[],
    { executor = this.knex }: { executor?: Knex } = {},
  ): Promise<void> {
    if (writes.length === 0) {
      return;
    }

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
            member_id: memberId,
            custom_field_key: field.key,
            path: leaf.path,
            value_text: leaf.value_text,
            created_at: now,
            updated_at: now,
          })),
        );
      }

      if (clearedKeys.length > 0) {
        await trx(VALUES_TABLE)
          .where('member_id', memberId)
          .whereIn('custom_field_key', clearedKeys)
          .del();
      }

      if (clearedPaths.length > 0) {
        // One statement with a group per field, rather than a statement per field.
        await trx(VALUES_TABLE)
          .where('member_id', memberId)
          .where((builder) => {
            for (const { fieldKey, paths } of clearedPaths) {
              builder.orWhere((pair) =>
                pair.where('custom_field_key', fieldKey).whereIn('path', paths),
              );
            }
          })
          .del();
      }

      for (let from = 0; from < rows.length; from += UPSERT_CHUNK) {
        // Typed as the plain row because `merge` takes its columns as `keyof` the
        // builder's record, which for a composite table registration is the scope
        // names rather than the columns.
        await trx<DbLeafRow>(VALUES_TABLE)
          .insert(rows.slice(from, from + UPSERT_CHUNK))
          // Naming the columns rather than giving values takes each from the row
          // that lost the conflict, so every part updates to its own value.
          .onConflict(['member_id', 'custom_field_key', 'path'])
          .merge(['value_text', 'updated_at']);
      }
    };

    // knex's marker for a transactor: join it rather than nesting a savepoint under it.
    if (executor.isTransaction) {
      await apply(executor);
    } else {
      await executor.transaction(apply);
    }
  }
}
