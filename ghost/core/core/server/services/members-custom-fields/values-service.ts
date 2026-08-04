import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import type {Knex} from 'knex';
import {z} from 'zod';
import {FIELD_TYPES, subFieldsOf, type FieldType} from '@tryghost/custom-field-types';
import {DbCustomFieldValueWithField, FIELD_STATUS, StoredCompositeValue} from './schema';
import {activeFields} from './queries';
import {storageCodecFor, storageColumnsFor} from './storage';

const FIELDS_TABLE = 'members_custom_fields';
const VALUES_TABLE = 'members_custom_field_values';

// Matches the `members_custom_fields.key` column (schema.js), so no key a site
// could actually have minted is ever refused by it.
const MAX_KEY_LENGTH = 191;

// Values arrive keyed by field key. Each value stays `unknown` here: it is
// validated by its own field type's schema, which isn't known until the key is
// resolved to a definition.
const ValuesInput = z.record(z.string().max(MAX_KEY_LENGTH), z.unknown());

// JSON.parse as a total function. Anything unreadable — unparseable text, or the null
// a nullable column can always return — reads as `undefined`, which no value schema
// accepts. That way a corrupt blob is turned away by the same check that turns away a
// well-formed one of the wrong shape, instead of needing a branch of its own.
function decodeJson(raw: string | null): unknown {
    if (raw === null) {
        return undefined;
    }
    try {
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
}

// The field facts the value path needs: the id to write the FK, the key to match
// input against, the name for error messages, and the type to pick the validator
// and storage column. All columns on members_custom_fields, so a value operation
// resolves them with a direct query rather than routing through the definitions
// service — the same way the read path already joins the table directly.
interface ActiveField {
    id: string;
    key: string;
    name: string;
    type: FieldType;
}

// A resolved, validated write. `value` absent means clear (delete the row).
interface PlannedWrite {
    field: ActiveField;
    value?: unknown;
}

/**
 * The value half of member custom fields: reading and writing what a member holds
 * for each defined field. It belongs to the member aggregate — a value is data
 * about a member — while field definitions belong to the site's settings; that
 * aggregate boundary, not a technical layer, is why this is a separate service.
 *
 * It owns the `members_custom_field_values` table and reads `members_custom_fields`
 * directly for the reference data it needs (which fields are active, and how they
 * validate), rather than calling the definitions service — the same way the other
 * knex services here talk to the database.
 */
export class CustomFieldValuesService {
    private knex: Knex;
    /**
     * @private
     * A getter rather than a number: the ceiling is an operator setting that can
     * change between requests.
     */
    private getMaxDefinitions: () => number;

    constructor({knex, getMaxDefinitions}: {knex: Knex, getMaxDefinitions: () => number}) {
        this.knex = knex;
        this.getMaxDefinitions = getMaxDefinitions;
    }

    /**
     * The active fields for a set of keys, keyed by key, for resolving a write.
     * Scoped to the keys the caller is actually writing rather than every active
     * field, since a publisher may have defined many and an edit touches few.
     */
    private async activeFieldsByKey(keys: string[]): Promise<Map<string, ActiveField>> {
        if (keys.length === 0) {
            return new Map();
        }
        const fields = await activeFields(this.knex)
            .whereIn('key', keys)
            .select('id', 'key', 'name', 'type');
        return new Map(fields.map(field => [field.key, field]));
    }

    /**
     * Members' values for every active field, keyed by member id, then by field
     * key. A member with no values is absent from the outer map; a field a member
     * has no value for is absent from the inner one — "not set" is the absence of
     * a key, told apart from a value by not being there. Archived fields are
     * excluded to match the definitions `browse`: their values stay in the
     * database, they just stop being addressable.
     *
     * One query for the whole set, so a member list can't turn into an N+1.
     *
     * Reading is best-effort per value: a stored value whose type has since left
     * the catalog, or that won't decode, is omitted and logged rather than failing
     * the whole read. Stored data outlives the catalog, so one stale row must not
     * take down a member's payload.
     */
    async getValuesForMembers(memberIds: string[]): Promise<Map<string, Record<string, unknown>>> {
        const byMember = new Map<string, Record<string, unknown>>();
        if (memberIds.length === 0) {
            return byMember;
        }

        const rows = await this.knex(VALUES_TABLE)
            .join(FIELDS_TABLE, `${VALUES_TABLE}.custom_field_id`, `${FIELDS_TABLE}.id`)
            .whereIn(`${VALUES_TABLE}.member_id`, memberIds)
            // Read join, so the status filter is qualified and lives inline — it
            // shares the invariant's vocabulary with queries.ts, not its builder.
            .where(`${FIELDS_TABLE}.status`, FIELD_STATUS.active)
            .orderBy(`${FIELDS_TABLE}.created_at`, 'asc')
            .orderBy(`${FIELDS_TABLE}.id`, 'asc')
            .select(`${VALUES_TABLE}.member_id`, `${FIELDS_TABLE}.key`, `${FIELDS_TABLE}.type`, `${VALUES_TABLE}.value_text`, `${VALUES_TABLE}.value_json`);

        for (const row of rows) {
            try {
                const {member_id: memberId, key, type, ...stored} = DbCustomFieldValueWithField.parse(row);
                const codec = storageCodecFor(type);
                const raw = stored[codec.column];
                // The column the type routes to is the only one that can hold this
                // field's value; a null there means the row is not carrying one.
                if (raw === null) {
                    continue;
                }
                const values = byMember.get(memberId) ?? {};
                values[key] = codec.decode(raw);
                byMember.set(memberId, values);
            } catch (err) {
                logging.warn(`Skipping undecodable custom field value (field '${row.key}', type '${row.type}'): ${err instanceof Error ? err.message : String(err)}`);
            }
        }

        return byMember;
    }

    /**
     * @private
     * Input as the values object it claims to be, rejecting anything that isn't
     * one. Shared by every caller so they cannot disagree on what a values object
     * is, or on the error when it isn't one.
     */
    private parseValues(input: unknown): Record<string, unknown> {
        const parsed = ValuesInput.safeParse(input);
        if (!parsed.success) {
            throw new errors.ValidationError({message: 'Custom field values must be an object keyed by field key.', property: 'custom_fields'});
        }

        return parsed.data;
    }

    /**
     * Whether input names any values. An absent key names none; anything present
     * that isn't a values object throws, with the same error resolving it would
     * have raised.
     *
     * Answers the shape question alone, with no catalog lookup, so it can be asked
     * before a write is known to be permitted.
     */
    namesValues(input: unknown): boolean {
        if (input === undefined) {
            return false;
        }

        return Object.keys(this.parseValues(input)).length > 0;
    }

    /**
     * Resolve input into the writes it implies, rejecting anything invalid, and
     * writing nothing. Returned so a caller can validate before it commits to a
     * change it would have to unwind (the member edit and the importer both validate
     * up front, before opening a transaction), then apply the same plan without
     * re-resolving or re-validating.
     */
    async planWrite(input: unknown): Promise<PlannedWrite[]> {
        const values = this.parseValues(input);
        const keys = Object.keys(values);

        // A write cannot name more fields than the site may define, so the
        // definitions ceiling bounds it. This also holds the lookup below within the
        // database driver's bound-parameter limit, which one key per parameter would
        // otherwise exceed.
        const maxKeys = this.getMaxDefinitions();
        if (keys.length > maxKeys) {
            throw new errors.ValidationError({
                message: `Custom field values are limited to ${maxKeys} fields per request.`,
                property: 'custom_fields'
            });
        }

        const byKey = await this.activeFieldsByKey(keys);
        const writes: PlannedWrite[] = [];

        for (const [key, raw] of Object.entries(values)) {
            const field = byKey.get(key);
            if (!field) {
                // Unknown (or archived) key. Rejected rather than ignored: a typo
                // that silently drops a value is worse than a failed save.
                throw new errors.ValidationError({message: `Unknown custom field: ${key}`, property: `custom_fields.${key}`});
            }

            // `null` clears any field. An empty string clears a text-backed field —
            // an emptied input — but for any other storage type '' is a value to
            // validate, not a clear, so nothing is coerced: a string sent to a
            // (future) non-text field fails validation rather than silently deleting.
            if (raw === null || (raw === '' && FIELD_TYPES[field.type].storageType === 'text')) {
                writes.push({field});
                continue;
            }

            // The field type owns what a valid value is — core just runs it. For a
            // composite the issue path points at the offending sub-field, so the
            // property reads `custom_fields.home_address.postal_code`.
            const value = FIELD_TYPES[field.type].value.safeParse(raw);
            if (!value.success) {
                const issue = value.error.issues[0];
                throw new errors.ValidationError({
                    message: `Invalid value for custom field '${field.name}'.`,
                    context: issue.message,
                    property: [`custom_fields.${key}`, ...issue.path].join('.')
                });
            }
            writes.push({field, value: value.data});
        }

        return writes;
    }

    /**
     * @private
     * The composite values this member already holds for the fields in a plan,
     * keyed by field id. Composites only: a scalar has nothing to merge into.
     *
     * Read through the caller's executor, never the base connection. On a
     * single-connection pool a read off `this.knex` inside an open transaction
     * waits for the connection that transaction is holding, and hangs.
     *
     * A blob that won't decode is left out, so the write replaces it rather than
     * merging into something unreadable.
     */
    private async storedComposites(trx: Knex, memberId: string, writes: PlannedWrite[]): Promise<Map<string, Record<string, unknown>>> {
        const composites = new Map<string, Record<string, unknown>>();
        // Merging is only meaningful for a value with parts, which is a fact about the
        // type's shape rather than the column it lands in. Asking the storage type
        // instead would sweep in the first json-backed type that isn't a record — a
        // multi-select held as a list, say — and log a decode failure for every row of
        // an import, over a value that reads back perfectly well.
        const fieldIds = writes
            .filter(({field, value}) => value !== undefined && subFieldsOf(field.type) !== null)
            .map(({field}) => field.id);

        if (fieldIds.length === 0) {
            return composites;
        }

        const rows = await trx(VALUES_TABLE)
            .where('member_id', memberId)
            .whereIn('custom_field_id', fieldIds)
            .whereNotNull('value_json')
            .select('custom_field_id', 'value_json')
            // Merging reads a value and writes it back, so the row has to stay still in
            // between: without the lock a write committing after this read is overwritten
            // by the sub-fields it just replaced. knex omits this on SQLite, which needs
            // no lock — its pool is a single connection, so writes never overlap.
            .forUpdate();

        for (const row of rows) {
            // The blob is the edge here: the columns come from a query written just
            // above, but whatever an earlier write left in value_json is unknown until
            // it is read back. Parsing it is what narrows the type, and it rejects the
            // array, null or bare number the column could equally be holding.
            const stored = StoredCompositeValue.safeParse(decodeJson(row.value_json));
            if (stored.success) {
                composites.set(row.custom_field_id, stored.data);
                continue;
            }
            logging.warn(`Replacing an unreadable custom field value rather than merging into it (member '${memberId}', field '${row.custom_field_id}').`);
        }

        return composites;
    }

    /**
     * @private
     * The stored sub-fields with the incoming ones written over them, re-checked
     * against the field type before it is handed back.
     *
     * The re-check is what makes this safe to write without a second thought. Both
     * halves were valid when they were written, but "valid" is a moving target: the
     * stored half may predate a change to the type, so it can carry a sub-field the
     * type has since dropped or a bound it has since tightened. Parsing the result
     * strips what no longer belongs instead of faithfully persisting it on every
     * import from here on.
     *
     * A merged value that won't parse falls back to the incoming value alone rather
     * than failing. The row is trying to write something valid, and refusing it over
     * data that was already in the database punishes the wrong write.
     */
    private mergeComposite(field: ActiveField, existing: Record<string, unknown>, incoming: Record<string, unknown>): unknown {
        const merged = FIELD_TYPES[field.type].value.safeParse({...existing, ...incoming});
        if (merged.success) {
            return merged.data;
        }

        logging.warn(`Replacing a custom field value that no longer validates rather than merging into it (field '${field.key}').`);
        return incoming;
    }

    /**
     * Apply a plan from `planWrite`.
     *
     * Merge, not replace: only the fields in the plan are touched, so a caller
     * that doesn't know about a field can't erase it.
     *
     * `mergeComposites` extends that same rule from a field to a composite's
     * sub-fields, because a sub-field is a field: a row writes the sub-fields it
     * fills and leaves the rest alone, exactly as a blank `name` column leaves a
     * member's name alone. The CSV import needs it — without it a file naming one
     * address column would replace the whole address, clearing five sub-fields it
     * never mentioned. The API does not merge: a PUT sends a whole address, so
     * what it sends is what should be stored.
     *
     * The merge is asked for here rather than at plan time, where the caller's intent
     * is otherwise expressed, because it cannot happen before a transaction is open:
     * it reads the stored value and writes it back, and the row lock that keeps those
     * two steps together only exists inside the transaction. `planWrite` runs before
     * one is opened -- the importer plans a row, then opens a transaction per member --
     * so a merge decided there would have to read outside the lock it depends on.
     *
     * Always transactional, so a mid-batch failure rolls the batch back. Passed an
     * executor it joins that transaction -- the importer passes its per-member one, so a
     * failed value write takes the member with it; passed nothing it opens its own.
     */
    async applyWrite(
        memberId: string,
        writes: PlannedWrite[],
        executor: Knex = this.knex,
        {mergeComposites = false}: {mergeComposites?: boolean} = {}
    ): Promise<void> {
        if (writes.length === 0) {
            return;
        }

        const apply = async (trx: Knex) => {
            const stored = mergeComposites
                ? await this.storedComposites(trx, memberId, writes)
                : new Map<string, Record<string, unknown>>();

            for (const {field, value} of writes) {
                const target = {member_id: memberId, custom_field_id: field.id};

                if (value === undefined) {
                    await trx(VALUES_TABLE).where(target).del();
                    continue;
                }

                // Both sides of the merge go through the same shape check, so it joins
                // two objects the type system knows about rather than two assertions.
                // The plan already validated `value` against its field type, so for a
                // composite this parse cannot fail; a scalar simply doesn't match, and
                // falls through to being written as it stands.
                const existing = stored.get(field.id);
                const incoming = StoredCompositeValue.safeParse(value);
                const merged = existing && incoming.success
                    ? this.mergeComposite(field, existing, incoming.data)
                    : value;

                const valueColumns = storageColumnsFor(field.type, merged);
                await trx(VALUES_TABLE)
                    .insert({id: new ObjectID().toHexString(), ...target, ...valueColumns, created_at: new Date()})
                    // The unique index on (member_id, custom_field_id) is
                    // what makes this an upsert rather than a read-then-write race.
                    .onConflict(['member_id', 'custom_field_id'])
                    .merge({...valueColumns, updated_at: new Date()});
            }
        };

        // isTransaction is knex's marker for a transactor: join an existing transaction
        // rather than nesting a savepoint under it, otherwise open one.
        if (executor.isTransaction) {
            await apply(executor);
        } else {
            await executor.transaction(apply);
        }
    }
}
