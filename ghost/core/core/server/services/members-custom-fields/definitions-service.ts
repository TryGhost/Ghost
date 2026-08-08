import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import type {Knex} from 'knex';
import {z} from 'zod';
import {CustomField} from './models';
import {FieldTypeSchema} from '@tryghost/custom-field-types';
import {customFieldCodec} from './codec';
import {FIELD_STATUS, FieldStatusSchema} from './schema';
import {activeFields, inFieldOrder} from './queries';
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

// A key becomes a property name on the plain objects that carry a member's values —
// on both sides of the wire, since `custom_fields` is JSON and a client gets a plain
// object from JSON.parse. A key naming a member of Object.prototype reads back as
// inherited rather than absent wherever one of those objects is indexed, and
// `__proto__` holds no value at all: the values schema drops it during parse, and
// assigning it sets a prototype rather than a property.
//
// Derived rather than listed, because the set is a consequence of how keys are
// minted: slugifying lowercases, so only an already-lowercase prototype name can
// survive to become a key. Currently `constructor` and `__proto__`.
const RESERVED_KEYS = Object.getOwnPropertyNames(Object.prototype)
    .filter(name => slugify(name) === name);

const FieldName = z.string().trim().min(1, {message: 'Custom field name is required.'}).max(MAX_NAME_LENGTH, {message: 'Custom field name is too long.'});

// The backend mints the key from the name, so create takes just a name and type.
const AddFieldInput = z.object({
    name: FieldName,
    type: FieldTypeSchema
});

// A bound on the work one request can ask for, separate from how many definitions
// a site may hold in total. Every definition in a batch costs several queries
// inside one open write transaction, so an operator raising the site ceiling must
// not also mean a single request can ask for an unbounded amount of that work.
const MAX_FIELDS_PER_REQUEST = 100;

// Create accepts a batch. The framework guarantees a non-empty array by the time a
// query runs, but the service validates the whole payload up front so a bad item
// anywhere fails the request before anything is written.
const AddFieldsInput = z.array(AddFieldInput)
    .min(1)
    .max(MAX_FIELDS_PER_REQUEST, {message: `Custom fields can only be created ${MAX_FIELDS_PER_REQUEST} at a time.`});

// A reorder states the whole list: every key, in the order it should have. Only the
// key is read — the client sends whole field objects because that is the shape the API
// speaks in, and everything else on them is already immutable or edited elsewhere.
//
// No length bound here, because the only correct length is "however many definitions
// this site has" and that is not a constant. An order too long to be the list is turned
// away before it reaches this (see assertOrderCouldBeComplete).
const ReorderInput = z.array(z.object({
    key: z.string().min(1, {message: 'Every custom field in the order needs a key.'})
})).min(1, {message: 'The order must name every custom field.'});

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
    private getMaxDefinitions: () => number;

    constructor({knex, recordAction, getMaxDefinitions}: {knex: Knex; recordAction: RecordCustomFieldAction; getMaxDefinitions: () => number}) {
        this.knex = knex;
        this.recordAction = recordAction;
        // A getter, not a value: the ceiling can be raised or lowered at any time,
        // and a Ghost container holds no state across requests, so the limit that
        // applies is whatever it resolves to when the request lands. Asking on
        // every create means a change takes effect on the next one, with no
        // restart. Where the number comes from is the caller's business.
        this.getMaxDefinitions = getMaxDefinitions;
    }

    async browse(options: {filter?: string} = {}): Promise<CustomField[]> {
        // Archived fields are hidden by default: most surfaces (member details, the
        // filter picker, the importer) only ever want active fields. A caller-
        // supplied `filter` can widen that — Settings pulls active and archived
        // together in one request (`filter=status:[active,archived]`).
        //
        // Whichever set comes back, it comes back in the publisher's order: filtering
        // narrows the list, it never reorders it.
        const query = options.filter
            ? applyFilter(this.knex(TABLE), options.filter)
            : activeFields(this.knex);
        return this.list(query);
    }

    /**
     * Decode a definition query into the domain, in the publisher's order.
     *
     * Typed off `activeFields` so the builder keeps the table's row type: every caller
     * hands over a query against the definitions table, whatever it has narrowed.
     */
    private async list(query: ReturnType<typeof activeFields>): Promise<CustomField[]> {
        const rows = await inFieldOrder(query).select('*');
        return rows.map(row => z.decode(customFieldCodec, row));
    }

    async read(key: string): Promise<CustomField> {
        const row = await this.knex(TABLE).where('key', key).first();
        if (!row) {
            throw new errors.NotFoundError({message: 'Custom field not found.'});
        }
        return z.decode(customFieldCodec, row);
    }

    /**
     * Create one or more field definitions. All-or-nothing: the batch runs in a
     * single transaction, so a name clash or the operational cap on the third item
     * leaves the first two unwritten rather than half-applying the request.
     *
     * Running inside the transaction also makes a batch self-consistent for free —
     * `assertNameAvailable` and `mintKey` see the rows inserted earlier in the same
     * batch, so two items sharing a name are caught and two items sharing a slug
     * get distinct keys, exactly as if they had arrived as separate requests.
     */
    async add(context: RequestContext, input: unknown): Promise<CustomField[]> {
        const requestedCount = Array.isArray(input) ? input.length : 0;

        const parsed = AddFieldsInput.safeParse(input);
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            throw new errors.ValidationError({
                message: issue.message,
                property: propertyOf(issue.path),
                context: batchContext(issue.path[0], requestedCount)
            });
        }
        const fields = parsed.data;

        // Slugify before opening the transaction: it needs no database access, and
        // an unusable name is a payload problem worth reporting on its own terms.
        const bases = fields.map((field, index) => {
            const base = slugify(field.name);
            if (!base) {
                throw new errors.ValidationError({
                    message: 'Custom field name must contain at least one usable character.',
                    property: 'name',
                    context: batchContext(index, requestedCount)
                });
            }
            return base;
        });

        let created: CustomField[];
        try {
            created = await this.knex.transaction(async (trx) => {
                await this.assertWithinLimit(trx, fields.length);

                // Read once, before the loop: a batch appends as consecutive ranks, so
                // the five fields of one request land in the order the request gave
                // them rather than all sharing the end of the list.
                const firstSortOrder = await this.nextSortOrder(trx);

                const keys: string[] = [];
                for (const [index, field] of fields.entries()) {
                    await this.assertNameAvailable(trx, field.name);
                    const key = await this.mintKey(trx, bases[index]);
                    await trx(TABLE).insert({
                        id: new ObjectID().toHexString(),
                        key,
                        name: field.name,
                        type: field.type,
                        sort_order: firstSortOrder + index,
                        created_at: new Date()
                    });
                    keys.push(key);
                }
                return this.readMany(trx, keys);
            });
        } catch (err) {
            // mintKey already picked a free key, so a unique violation here only
            // means a concurrent create claimed the same key in between. The index
            // is the final arbiter; surface a retryable conflict rather than a 500.
            if (isUniqueConstraintViolation(err)) {
                throw new errors.ConflictError({message: 'Could not create the custom field, please try again.'});
            }
            throw err;
        }

        // Logged after the commit: the action log is a separate Bookshelf write
        // outside this transaction, so recording inside it would leave orphaned
        // "added" entries for fields a rollback never created.
        for (const field of created) {
            await this.recordAction({context, verb: 'create', subject: field.id, details: {primary_name: field.name, key: field.key}});
        }
        return created;
    }

    /**
     * The operational ceiling on how many definitions a site can hold. This is a
     * safeguard against the database load unbounded definitions would create, not
     * a pricing or packaging limit, so it applies wherever the feature is available
     * and is deliberately not routed through the entitlement-driven limit service.
     *
     * Both active and archived definitions count: an archived field still occupies
     * a row and still carries its members' values, so archiving alone frees no
     * space. Deleting an archived field is what releases a slot.
     *
     * The count is a consistent read, not a locking one, so two creates landing at
     * the same instant can both pass and take a site one over. That is deliberate:
     * this is a ceiling on database load, and holding a table lock across every
     * create to make it exact would cost more than the overshoot it prevents.
     *
     */
    private async assertWithinLimit(db: Knex, addedCount: number): Promise<void> {
        const max = this.getMaxDefinitions();

        const row = await db(TABLE).count({count: '*'}).first();
        const total = Number(row?.count ?? 0);
        if (total + addedCount <= max) {
            return;
        }

        // Two different situations reach here and they need different advice. At or
        // over the ceiling there is nothing to do but free a slot. With slots still
        // free the request was simply too big, and telling that operator to delete
        // something is wrong: they have room, just not this much.
        const remaining = max - total;
        const advice = remaining > 0
            ? `You can add ${remaining} more.`
            : 'Delete a field you no longer need to make room.';

        throw new errors.HostLimitError({
            message: `Custom fields are limited to ${max} per site. ${advice}`,
            code: 'CUSTOM_FIELDS_LIMIT_REACHED',
            // `requested` is carried alongside the limit-service shape so a batch
            // rejection is self-describing: without it a client sees free slots and
            // a refusal, and has to re-derive its own payload size to explain why.
            errorDetails: {limit: max, total, requested: addedCount}
        });
    }

    /**
     * Set the publisher's order for the whole list.
     *
     * Takes every key in the order the list should have and writes a fresh rank to
     * every row, rather than moving one field relative to its neighbours. That is what
     * makes a move well-defined on a site that has never reordered, where every row
     * still holds the same default rank and there is nothing to move between: the
     * order is not adjusted, it is stated.
     *
     * Replaying the same list is a no-op, and a rejected list changes nothing. The
     * response is the whole list, matching the request: a reorder names every
     * definition, so it returns every definition, archived ones included. That is what
     * a caller needs to re-sync, and it is the one read here that does not hide them.
     */
    async reorder(context: RequestContext, input: unknown): Promise<CustomField[]> {
        await this.assertOrderCouldBeComplete(input);

        const parsed = ReorderInput.safeParse(input);
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            throw new errors.ValidationError({message: issue.message, property: propertyOf(issue.path)});
        }
        const keys = parsed.data.map(item => item.key);

        const ordered = await this.knex.transaction(async (trx) => {
            await this.assertNamesEveryField(trx, keys);

            // One statement per field, and the rank comes from the request's order while
            // the statements go out in key order. Two publishers dragging at the same
            // moment write the same rows, and a database takes a row lock as it updates
            // each one: if the two transactions walked their own lists, each would hold a
            // row the other was waiting for and MySQL would break the tie by killing one
            // of them. Locking in an order both agree on regardless of what they are
            // writing means there is no cycle to break. The last writer wins, which is
            // what a drag should do.
            //
            // This settles reorder against reorder, not reorder against everything. A
            // member's values reference these rows, so writing them takes a shared lock
            // on each definition, in whatever order that request happened to name its
            // fields — which can still cross with the exclusive locks held here. Rarer,
            // and not worth serialising every member write to close.
            //
            // `updated_at` deliberately stays put: it says when the definition changed,
            // and a definition does not change when the list around it is reordered.
            const ranks = new Map(keys.map((key, rank) => [key, rank]));
            for (const key of [...keys].sort()) {
                await trx(TABLE).where('key', key).update({sort_order: ranks.get(key)!});
            }

            return this.list(trx(TABLE));
        });

        await this.recordAction({
            context,
            verb: 'reorder',
            // The act was on the list, so it belongs to no one field.
            subject: null,
            details: {action_name: 'reordered', count: ordered.length}
        });
        return ordered;
    }

    /**
     * Refuse an order that is already too long to be the list, before it is parsed.
     *
     * The check below is the real one, but it runs on a parsed array, and parsing is
     * the work worth avoiding: an order has to name every definition, so its length is
     * fixed by the table rather than chosen by the request, and a request claiming more
     * entries than the table holds can be turned away on its length alone.
     *
     * The count is deliberately not a limit anyone configures. The site's ceiling on
     * definitions can be raised or lowered at any time, and a lowered ceiling must not
     * leave a site unable to reorder the fields it already has.
     */
    private async assertOrderCouldBeComplete(input: unknown): Promise<void> {
        if (!Array.isArray(input)) {
            throw new errors.ValidationError({message: 'The order must be a list of custom fields.'});
        }

        const row = await this.knex(TABLE).count({count: '*'}).first();
        const total = Number(row?.count ?? 0);
        if (input.length > total) {
            throw new errors.ValidationError({
                message: 'The order names more custom fields than this site has.',
                property: 'key'
            });
        }
    }

    /**
     * A reorder must name every definition exactly once.
     *
     * Anything else is a client working from a list that is not the one in the database,
     * and a partial statement of the order is not something to half-apply: the safe
     * answer is to reject it. A client that loaded before a colleague added a field
     * cannot name that field, so it is told to reload rather than writing an order that
     * was never true of the whole list.
     *
     * This is not a guard against a concurrent *reorder*. Two publishers dragging at
     * once both name the same complete list, both are accepted, and the last one wins —
     * which is the right answer for a drag, and why nothing here tries to detect it.
     */
    private async assertNamesEveryField(db: Knex, keys: string[]): Promise<void> {
        const named = new Set<string>();
        for (const key of keys) {
            if (named.has(key)) {
                throw new errors.ValidationError({
                    message: 'A custom field can only appear once in the order.',
                    property: 'key',
                    context: `"${key}" appears more than once.`
                });
            }
            named.add(key);
        }

        const existing = new Set(await db(TABLE).pluck<string[]>('key'));

        const unknown = keys.find(key => !existing.has(key));
        if (unknown) {
            throw new errors.ValidationError({
                message: 'The order names a custom field that does not exist.',
                property: 'key',
                context: `No custom field is keyed "${unknown}".`
            });
        }

        const missing = [...existing].find(key => !named.has(key));
        if (missing) {
            throw new errors.ValidationError({
                message: 'The order must name every custom field.',
                property: 'key',
                context: `"${missing}" is missing from the order. Reload and try again.`
            });
        }
    }

    /**
     * Where a newly created field goes: the end.
     *
     * Appending keeps a create cheap — one row written, none renumbered — and matches
     * what Settings already shows, where a new field turns up at the bottom of the list
     * it was added to. Archived fields count: they hold a rank like any other, so a
     * field created after one was archived still lands past it.
     */
    private async nextSortOrder(db: Knex): Promise<number> {
        const row = await db(TABLE).max({highest: 'sort_order'}).first();
        const highest = row?.highest;
        // No fields yet, so this one starts the order.
        if (highest === null || highest === undefined) {
            return 0;
        }
        return Number(highest) + 1;
    }

    /** Read back a batch in the order its keys were created, not the table's order. */
    private async readMany(db: Knex, keys: string[]): Promise<CustomField[]> {
        const rows = await db(TABLE).whereIn('key', keys).select('*');
        const byKey = new Map(rows.map(row => [row.key, row]));
        return keys.map(key => z.decode(customFieldCodec, byKey.get(key)!));
    }

    /**
     * Pick a free key from the name's slug: `base`, then `base-2`, `base-3`, ...
     * Reads the keys already taken by that base — including archived fields, so a
     * slug is never reused once minted. Mirrors how tags/labels generate slugs.
     */
    private async mintKey(db: Knex, base: string): Promise<string> {
        const safeBase = base.slice(0, MAX_KEY_BASE_LENGTH);
        const taken = new Set([
            ...RESERVED_KEYS,
            ...await db(TABLE).where('key', 'like', `${safeBase}%`).pluck('key')
        ]);
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
    private async assertNameAvailable(db: Knex, name: string, exceptKey?: string): Promise<void> {
        const query = db(TABLE).whereRaw('LOWER(name) = ?', [name.toLowerCase()]);
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
            await this.assertNameAvailable(this.knex, patch.name, key);
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
            await this.recordAction({context, verb: 'rename', subject: existing.id, details: {primary_name: patch.name, key, previous_name: existing.name}});
        }

        // A status change is the archive/restore transition. Only write (and log)
        // when it actually flips, so re-sending the current status is a no-op.
        if (patch.status !== undefined && patch.status !== existing.status) {
            await this.knex(TABLE)
                .where('key', key)
                .update({status: patch.status, updated_at: new Date()});
            const verb = patch.status === FIELD_STATUS.archived ? 'archive' : 'restore';
            await this.recordAction({context, verb, subject: existing.id, details: {primary_name: patch.name ?? existing.name, key}});
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
        await this.recordAction({context, verb: 'delete', subject: field.id, details: {primary_name: field.name, key}});
    }
}

// The field a zod issue points at. Create validates an array, so an issue's path
// is prefixed with the item's index (`[0, 'name']`); `property` names the field
// that is wrong, so the numeric prefix is dropped. Which item it was is reported
// separately by batchContext, keeping `property` the bare field name a client can
// map straight onto its form input.
function propertyOf(path: PropertyKey[]): string | undefined {
    return path.find(segment => typeof segment === 'string');
}

// Which definition of a batch an error belongs to. Only set when the request
// carried more than one: a lone definition needs no pointer, and every client
// today sends exactly one, so this stays absent on the common path.
function batchContext(index: PropertyKey | undefined, requestedCount: number): string | undefined {
    if (requestedCount <= 1 || typeof index !== 'number') {
        return undefined;
    }
    return `Custom field ${index + 1} of ${requestedCount}.`;
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
