import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import { z } from 'zod';
import { FIELD_TYPES, subFieldsOf, type FieldType } from '@tryghost/custom-field-types';
import {
  CUSTOM_NAMESPACE,
  QUALIFIER,
  formatIdentity,
  parseIdentity,
} from '@tryghost/custom-field-types/identity';
import { DbCustomFieldLeaf, DbCustomFieldValue, FIELD_STATUS, type WrittenBy } from './schema';
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

// Values are keyed by field identity (`namespace.key`) past the wire unwrap, and each
// stays `unknown`: it is validated by its own field type, which is not known until the
// identity is resolved to a definition. The key bound is a sanity limit so an absurd
// identity is refused without being echoed back; a real identity is two bounded
// segments plus part paths, comfortably under it.
const MAX_IDENTITY_LENGTH = MAX_KEY_LENGTH * 2 + 1;
const ValuesInput = z.record(z.string().max(MAX_IDENTITY_LENGTH), z.unknown());

/** The wire property naming one field in a member payload error. */
const wireProperty = (identity: string): string => [QUALIFIER, identity].join('.');

interface ActiveField {
  id: string;
  namespace: string;
  key: string;
  name: string;
  type: FieldType;
}

/** An absent `value` means clear the field. */
export interface PlannedWrite {
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

  /**
   * The active fields the given identities resolve to, keyed by identity.
   *
   * The query boundary: the table predates namespace storage and holds the
   * publisher's fields alone, so only `custom` identities can resolve and rows come
   * back wearing that namespace. An identity in any other namespace resolves to
   * nothing — a namespace with no fields yet, exactly like an unknown key — and the
   * day the storage learns namespaces, this is where the lookup widens.
   */
  private async activeFieldsByIdentity(identities: string[]): Promise<Map<string, ActiveField>> {
    const keys = identities
      .map((identity) => parseIdentity(identity))
      .filter((parsed) => parsed !== null && parsed.namespace === CUSTOM_NAMESPACE)
      .map((parsed) => (parsed as { key: string }).key);
    if (keys.length === 0) {
      return new Map();
    }
    const fields = await activeFields(this.knex)
      .whereIn('key', keys)
      .select('id', 'key', 'name', 'type');
    return new Map(
      fields.map((field) => [
        formatIdentity({ namespace: CUSTOM_NAMESPACE, key: field.key, path: null }),
        { ...field, namespace: CUSTOM_NAMESPACE },
      ]),
    );
  }

  /**
   * Members' values in the wire shape — keyed by member id, then namespace, then
   * field key; anything absent is unset. Every requested member gets an entry, with
   * an empty object for each namespace that has active fields, so a member with no
   * values still shows where values would go.
   *
   * Archived fields are excluded to match the definitions browse: their values stay in
   * the database and stop being addressable. A row that will not parse is dropped and
   * logged rather than failing the read, so one stale row cannot take down a member.
   *
   * Part of the query boundary: rows carry no namespace, so the one the storage
   * implicitly is gets stated here, the same place the codec states it for
   * definitions.
   */
  async getValuesForMembers(
    memberIds: string[],
  ): Promise<Map<string, Record<string, Record<string, unknown>>>> {
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
          {
            event: { name: 'members.custom_fields.value_unreadable' },
            err,
            customFieldKey: row.key,
            path: row.path,
          },
          'Skipping an unreadable custom field value',
        );
      }
    }

    const flat = valuesFromLeaves(leaves);
    return new Map(
      memberIds.map((memberId) => [memberId, { [CUSTOM_NAMESPACE]: flat.get(memberId) ?? {} }]),
    );
  }

  /** Shared by every caller so they cannot disagree on what a values record is. */
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

  /**
   * Unwrap the wire shape of member metafields — values nested one level under their
   * namespace — into one record keyed by field identity (`namespace.key`), which is
   * how the rest of this service speaks of values.
   *
   * No namespace is checked against anything: namespaces are data, and a namespace
   * with no fields fails later exactly the way an unknown key does, so a namespace
   * arriving with an app needs no change here. What is judged is shape alone — the
   * bag is an object of namespaces, and each namespace holds an object of values.
   *
   * `undefined` in, `undefined` out, so an absent bag stays distinguishable from an
   * empty one.
   */
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

    const byIdentity = await this.activeFieldsByIdentity(identities);
    const writes: PlannedWrite[] = [];

    for (const [identity, raw] of Object.entries(values)) {
      const field = byIdentity.get(identity);
      if (!field) {
        // Unknown, archived, or in a namespace that holds no fields yet — one
        // rule for all three. Refused rather than ignored: a typo that silently
        // drops what somebody typed is worse than a save that fails. The catalog
        // applies the same rule to the parts of a composite value.
        throw new errors.ValidationError({
          message: `Unknown custom field: ${identity}`,
          property: wireProperty(identity),
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
          property: [wireProperty(identity), ...issue.path].join('.'),
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
   * `writtenBy` is required and has no default: every writer has to name itself, so a new
   * one cannot quietly inherit the identity of whichever was written first.
   *
   * Always transactional. Given an executor it joins that transaction, so the importer's
   * failed value write takes its member with it; given none it opens its own.
   */
  async applyWrite(
    memberId: string,
    writes: PlannedWrite[],
    { writtenBy, executor = this.knex }: { writtenBy: WrittenBy; executor?: Knex },
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
            written_by_type: writtenBy.type,
            written_by_id: writtenBy.id,
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
          // The writer is merged with the value, so a leaf names who wrote what
          // it currently holds rather than who wrote its first value.
          .merge(['value_text', 'written_by_type', 'written_by_id', 'updated_at']);
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
