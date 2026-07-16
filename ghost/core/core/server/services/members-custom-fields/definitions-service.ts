import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import type {Knex} from 'knex';
import {z} from 'zod';
import {CustomField} from './models';
import {FieldTypeSchema} from '@tryghost/custom-field-types';
import {customFieldCodec} from './codec';
import {FIELD_STATUS, FieldStatusSchema} from './schema';
import {activeFields} from './queries';
import {type RecordCustomFieldAction, type RequestContext} from './actions';

// @tryghost/string ships no types; slugify is the same helper tags/labels use.
const {slugify} = require('@tryghost/string') as {slugify(input: string): string};

// The same NQL -> knex bridge Bookshelf's filter plugin uses, applied directly to
// our raw-knex query: nql parses the `filter` string to a Mongo query, mongo-knex
// turns that into parametrised WHERE clauses. Neither needs a Bookshelf model.
const nql = require('@tryghost/nql') as (filter: string) => {toJSON(): object};
const knexify = require('@tryghost/mongo-knex') as
    <T extends Knex.QueryBuilder>(qb: T, mongoQuery: object, config: {tableName: string}) => T;

const TABLE = 'members_custom_fields';

// Column limits come from the canonical schema — the same source the migration and
// Bookshelf models read — so the service can never drift from the database. The
// name cap turns an over-long input into a clean 422 (not a DB error), and the key
// base is capped so even the longest collision suffix stays within the column.
const columns = require('../../data/schema').tables[TABLE];
const MAX_NAME_LENGTH: number = columns.name.maxlength;
const MAX_KEY_LENGTH: number = columns.key.maxlength;
const MAX_SLUG_ITERATIONS = 1000;
// Reserve room for a `-<n>` suffix (n up to MAX_SLUG_ITERATIONS).
const MAX_KEY_BASE_LENGTH = MAX_KEY_LENGTH - (String(MAX_SLUG_ITERATIONS).length + 1);

const FieldName = z.string().trim().min(1, {message: 'Custom field name is required.'}).max(MAX_NAME_LENGTH, {message: 'Custom field name is too long.'});

// The backend mints the key from the name, so create takes just a name and type.
const AddFieldInput = z.object({
    name: FieldName,
    type: FieldTypeSchema
});

// Name and status are mutable. `key` and `type` are accepted so the immutability
// rules can reject a change loudly; they are never persisted.
const EditFieldInput = z.object({
    name: FieldName.optional(),
    status: FieldStatusSchema.optional(),
    key: z.string().optional(),
    type: FieldTypeSchema.optional()
});

export class CustomFieldDefinitionsService {
    private knex: Knex;
    private recordAction: RecordCustomFieldAction;

    constructor({knex, recordAction}: {knex: Knex; recordAction: RecordCustomFieldAction}) {
        this.knex = knex;
        this.recordAction = recordAction;
    }

    async browse(options: {filter?: string} = {}): Promise<CustomField[]> {
        // Archived fields are hidden by default: most surfaces (member details, the
        // filter picker, the importer) only ever want active fields. A caller-
        // supplied `filter` can widen that — Settings pulls active and archived
        // together in one request (`filter=status:[active,archived]`).
        //
        // Insertion order for now — when the UI needs a persistent user-defined
        // order, add a `sort_order` column and order by it.
        const query = options.filter
            ? applyFilter(this.knex(TABLE), options.filter)
            : activeFields(this.knex);
        const rows = await query
            .orderBy('created_at', 'asc')
            .orderBy('id', 'asc')
            .select('*');
        return rows.map(row => z.decode(customFieldCodec, row));
    }

    async read(key: string): Promise<CustomField> {
        const row = await this.knex(TABLE).where('key', key).first();
        if (!row) {
            throw new errors.NotFoundError({message: 'Custom field not found.'});
        }
        return z.decode(customFieldCodec, row);
    }

    async add(context: RequestContext, input: unknown): Promise<CustomField> {
        const parsed = AddFieldInput.safeParse(input);
        if (!parsed.success) {
            throw new errors.ValidationError({message: parsed.error.issues[0].message, property: parsed.error.issues[0].path[0]?.toString()});
        }

        const base = slugify(parsed.data.name);
        if (!base) {
            throw new errors.ValidationError({message: 'Custom field name must contain at least one usable character.', property: 'name'});
        }

        await this.assertNameAvailable(parsed.data.name);

        const id = new ObjectID().toHexString();
        const key = await this.mintKey(base);
        try {
            await this.knex(TABLE).insert({id, key, name: parsed.data.name, type: parsed.data.type, created_at: new Date()});
        } catch (err) {
            // mintKey already picked a free key, so a unique violation here only
            // means a concurrent create claimed the same key in between. The index
            // is the final arbiter; surface a retryable conflict rather than a 500.
            if (isUniqueConstraintViolation(err)) {
                throw new errors.ConflictError({message: 'Could not create the custom field, please try again.'});
            }
            throw err;
        }
        await this.recordAction({context, verb: 'create', subject: key, details: {primary_name: parsed.data.name}});
        return this.read(key);
    }

    /**
     * Pick a free key from the name's slug: `base`, then `base-2`, `base-3`, ...
     * Reads the keys already taken by that base — including archived fields, so a
     * slug is never reused once minted. Mirrors how tags/labels generate slugs.
     */
    private async mintKey(base: string): Promise<string> {
        const safeBase = base.slice(0, MAX_KEY_BASE_LENGTH);
        const taken = new Set(
            await this.knex(TABLE).where('key', 'like', `${safeBase}%`).pluck('key')
        );
        if (!taken.has(safeBase)) {
            return safeBase;
        }
        for (let suffix = 2; suffix <= MAX_SLUG_ITERATIONS; suffix += 1) {
            const candidate = `${safeBase}-${suffix}`;
            if (!taken.has(candidate)) {
                return candidate;
            }
        }
        throw new errors.ValidationError({message: 'Could not mint a unique key for this custom field.', property: 'name'});
    }

    /**
     * Names are globally unique (across active and archived) so the label is
     * never ambiguous — a unique index on `name` enforces it. This read gives a
     * clean `property: name` 422 for the common case (the raw index violation
     * can't be told apart from a key clash); the index is the race backstop.
     *
     * The LOWER() normalises case in application code because the engines
     * disagree: MySQL's default collation is case-insensitive, SQLite's is not,
     * so relying on the index alone would reject "Company"/"company" in prod but
     * allow it in the SQLite test/dev suites. `exceptKey` lets a field keep its
     * own name on an unrelated edit.
     */
    private async assertNameAvailable(name: string, exceptKey?: string): Promise<void> {
        const query = this.knex(TABLE).whereRaw('LOWER(name) = ?', [name.toLowerCase()]);
        if (exceptKey) {
            query.whereNot('key', exceptKey);
        }
        const clash = await query.first();
        if (clash) {
            throw new errors.ValidationError({message: 'A custom field with this name already exists.', property: 'name'});
        }
    }

    async edit(context: RequestContext, key: string, input: unknown): Promise<CustomField> {
        const parsed = EditFieldInput.safeParse(input);
        if (!parsed.success) {
            throw new errors.ValidationError({message: parsed.error.issues[0].message, property: parsed.error.issues[0].path[0]?.toString()});
        }
        const patch = parsed.data;

        const existing = await this.read(key);

        // Key and type are immutable after creation: values are addressed by key
        // and interpreted by type, so changing either would silently orphan or
        // corrupt stored values. Reject a differing value rather than ignore it.
        if (patch.key !== undefined && patch.key !== existing.key) {
            throw new errors.ValidationError({message: 'Custom field keys cannot be changed once created.', property: 'key'});
        }
        if (patch.type !== undefined && patch.type !== existing.type) {
            throw new errors.ValidationError({message: 'Custom field types cannot be changed once created.', property: 'type'});
        }

        // Only write (and log a rename) when the name actually changes, so
        // re-saving an unchanged field is a no-op rather than a spurious edit.
        if (patch.name !== undefined && patch.name !== existing.name) {
            await this.assertNameAvailable(patch.name, key);
            try {
                await this.knex(TABLE)
                    .where('key', key)
                    .update({name: patch.name, updated_at: new Date()});
            } catch (err) {
                if (isUniqueConstraintViolation(err)) {
                    throw new errors.ConflictError({message: 'Could not rename the custom field, please try again.'});
                }
                throw err;
            }
            await this.recordAction({context, verb: 'rename', subject: key, details: {primary_name: patch.name, previous_name: existing.name}});
        }

        // A status change is the archive/restore transition. Only write (and log)
        // when it actually flips, so re-sending the current status is a no-op.
        if (patch.status !== undefined && patch.status !== existing.status) {
            await this.knex(TABLE)
                .where('key', key)
                .update({status: patch.status, updated_at: new Date()});
            const verb = patch.status === FIELD_STATUS.archived ? 'archive' : 'restore';
            await this.recordAction({context, verb, subject: key, details: {primary_name: patch.name ?? existing.name}});
        }

        return this.read(key);
    }

    /**
     * Permanently delete a field and every member value attached to it (the FK
     * cascades the values). Destructive and irreversible, so it's gated on the
     * field already being archived: a publisher must archive first, then delete,
     * which makes accidental data loss a deliberate two-step. Archiving is the
     * reversible soft state (see `edit` with a status change).
     */
    async destroy(context: RequestContext, key: string): Promise<void> {
        const field = await this.knex(TABLE).where('key', key).first();
        if (!field) {
            throw new errors.NotFoundError({message: 'Custom field not found.'});
        }
        if (field.status !== FIELD_STATUS.archived) {
            throw new errors.ValidationError({message: 'Only archived custom fields can be deleted. Archive the field first.'});
        }
        await this.knex(TABLE).where('key', key).del();
        await this.recordAction({context, verb: 'delete', subject: key, details: {primary_name: field.name}});
    }
}

function isUniqueConstraintViolation(error: unknown): boolean {
    const code = (error as {code?: string})?.code;
    return code === 'ER_DUP_ENTRY' || code === 'SQLITE_CONSTRAINT';
}

// Apply a caller-supplied NQL filter to the definition query. A malformed filter
// is a client error (400), not a 500. The active-only default is preserved unless
// the filter itself constrains status, so a filter on another field (e.g. type)
// can never surface archived fields — this is the invariant queries.ts centralises,
// held here as the per-field default override Bookshelf's filter plugin does.
function applyFilter<T extends Knex.QueryBuilder>(query: T, filter: string): T {
    let mongoQuery: Record<string, unknown>;
    try {
        mongoQuery = nql(filter).toJSON() as Record<string, unknown>;
        knexify(query, mongoQuery, {tableName: TABLE});
    } catch (err) {
        throw new errors.BadRequestError({message: 'Could not parse the filter parameter.', property: 'filter', err: err as Error});
    }
    if (!filterReferencesStatus(mongoQuery)) {
        query.where('status', FIELD_STATUS.active);
    }
    return query;
}

// Whether an NQL-parsed filter constrains `status` anywhere, including inside the
// $and/$or/$nor combinators — so a status filter at any nesting counts as the
// caller opting in to (or out of) archived fields.
function filterReferencesStatus(query: Record<string, unknown>): boolean {
    return Object.entries(query).some(([key, value]) => {
        if (key === 'status') {
            return true;
        }
        if ((key === '$and' || key === '$or' || key === '$nor') && Array.isArray(value)) {
            return value.some(sub => filterReferencesStatus(sub as Record<string, unknown>));
        }
        return false;
    });
}
