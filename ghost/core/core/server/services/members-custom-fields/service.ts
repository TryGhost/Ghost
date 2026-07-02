import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import type {Knex} from 'knex';
import {z} from 'zod';
import {
    CustomField,
    CustomFieldKey,
    CustomFieldValueMap,
    FieldType,
    getFieldType
} from './models';
import {customFieldCodec} from './codec';
import {type RecordCustomFieldAction, type RequestContext} from './actions';

interface WriteOptions {
    // A knex transaction from an enclosing member write, so value upserts join it.
    transacting?: Knex.Transaction;
}

// The value read projection: each value row carries its field's key and type so
// the caller can route it through the registry into the flat {key: value} map.
interface CustomFieldValueRow {
    member_id: string;
    key: string;
    type: string;
    value_text: string | null;
}

// A field's identity and type, as needed to route and validate its values.
type FieldRef = {id: string; type: string};

const FieldName = z.string().trim().min(1, {message: 'Custom field name is required.'});

const AddFieldInput = z.object({
    key: CustomFieldKey,
    name: FieldName,
    type: FieldType
});

// Rename-only: `key` is accepted so the immutability rule can reject a change, but
// is never persisted. Absent fields are left untouched.
const EditFieldInput = z.object({
    name: FieldName.optional(),
    key: z.string().optional()
});

export class CustomFieldsService {
    private knex: Knex;
    private recordAction: RecordCustomFieldAction;

    constructor({knex, recordAction}: {knex: Knex; recordAction: RecordCustomFieldAction}) {
        this.knex = knex;
        this.recordAction = recordAction;
    }

    async browse(): Promise<CustomField[]> {
        // Insertion order for now. When the UI needs a persistent, user-defined
        // order, add a `sort_order` column and order by it here (an additive door).
        const rows = await this.knex('member_custom_fields')
            .orderBy('created_at', 'asc')
            .orderBy('id', 'asc')
            .select('*');
        return rows.map(row => z.decode(customFieldCodec, row));
    }

    async read(id: string): Promise<CustomField> {
        const row = await this.knex('member_custom_fields').where('id', id).first();
        if (!row) {
            throw new errors.NotFoundError({message: 'Custom field not found.'});
        }
        return z.decode(customFieldCodec, row);
    }

    async add(context: RequestContext, input: unknown): Promise<CustomField> {
        const parsed = AddFieldInput.safeParse(input);
        if (!parsed.success) {
            throw new errors.ValidationError({message: parsed.error.issues[0].message, property: 'custom_fields'});
        }

        const now = new Date();
        const row = {
            id: new ObjectID().toHexString(),
            key: parsed.data.key,
            name: parsed.data.name,
            type: parsed.data.type,
            created_at: now
        };

        try {
            await this.knex('member_custom_fields').insert(row);
        } catch (err) {
            if (isUniqueConstraintViolation(err)) {
                throw new errors.ValidationError({message: 'A custom field with this key already exists.', property: 'key'});
            }
            throw err;
        }

        await this.recordAction({context, verb: 'create', subject: row.id});
        return this.read(row.id);
    }

    async edit(context: RequestContext, id: string, input: unknown): Promise<CustomField> {
        const parsed = EditFieldInput.safeParse(input);
        if (!parsed.success) {
            throw new errors.ValidationError({message: parsed.error.issues[0].message, property: 'custom_fields'});
        }
        const patch = parsed.data;

        const existing = await this.read(id);

        // Keys are immutable after creation: values are addressed by key over the
        // wire, so renaming a key would silently orphan its stored values.
        if (patch.key !== undefined && patch.key !== existing.key) {
            throw new errors.ValidationError({message: 'Custom field keys cannot be changed once created.', property: 'key'});
        }

        if (patch.name !== undefined) {
            await this.knex('member_custom_fields')
                .where('id', id)
                .update({name: patch.name, updated_at: new Date()});
            await this.recordAction({context, verb: 'rename', subject: id});
        }

        return this.read(id);
    }

    async destroy(context: RequestContext, id: string): Promise<void> {
        // Delete values explicitly alongside the field so the cascade holds on any
        // engine, without relying on the FK's ON DELETE behaviour being enforced.
        await this.knex.transaction(async (trx) => {
            const field = await trx('member_custom_fields').where('id', id).first();
            if (!field) {
                throw new errors.NotFoundError({message: 'Custom field not found.'});
            }
            await trx('member_custom_field_values').where('member_custom_field_id', id).del();
            await trx('member_custom_fields').where('id', id).del();
        });

        await this.recordAction({context, verb: 'delete', subject: id});
    }

    /**
     * The flat `{key: value}` map for one member (empty when it has no values).
     */
    async getValuesForMember(memberId: string, options: WriteOptions = {}): Promise<CustomFieldValueMap> {
        const byMember = await this.getValuesForMembers([memberId], options);
        return byMember.get(memberId) ?? {};
    }

    /**
     * The `{key: value}` map for each of the given members, keyed by member id.
     * Members with no values are absent from the returned map.
     */
    async getValuesForMembers(memberIds: string[], options: WriteOptions = {}): Promise<Map<string, CustomFieldValueMap>> {
        const result = new Map<string, CustomFieldValueMap>();
        if (memberIds.length === 0) {
            return result;
        }

        const exec = options.transacting ?? this.knex;
        const rows = await exec('member_custom_field_values as v')
            .join('member_custom_fields as f', 'f.id', 'v.member_custom_field_id')
            .whereIn('v.member_id', memberIds)
            .select<CustomFieldValueRow[]>('v.member_id', 'f.key', 'f.type', 'v.value_text');

        for (const row of rows) {
            const definition = getFieldType(row.type);
            const value = definition && row.value_text !== null
                ? z.decode(definition.codec, row.value_text)
                : row.value_text;
            const map = result.get(row.member_id) ?? {};
            map[row.key] = value;
            result.set(row.member_id, map);
        }

        return result;
    }

    /**
     * Reject the whole write if any key is unknown or any value is invalid for its
     * field's type. Runs before the member is touched so an invalid payload never
     * partially applies.
     */
    async validateValues(values: CustomFieldValueMap, options: WriteOptions = {}): Promise<void> {
        const exec = options.transacting ?? this.knex;
        const fieldsByKey = await this.loadFieldsByKey(exec);
        this.assertValid(values, fieldsByKey);
    }

    /**
     * Validate then upsert a member's values in one transaction. A `null` value
     * clears the field; any other value is serialized and routed to its column.
     * Joins an enclosing transaction when one is supplied.
     */
    async setValuesForMember(memberId: string, values: CustomFieldValueMap, options: WriteOptions = {}): Promise<void> {
        const run = async (trx: Knex.Transaction) => {
            const fieldsByKey = await this.loadFieldsByKey(trx);
            this.assertValid(values, fieldsByKey);

            for (const [key, value] of Object.entries(values)) {
                const field = fieldsByKey.get(key)!;
                if (value === null) {
                    await trx('member_custom_field_values')
                        .where({member_custom_field_id: field.id, member_id: memberId})
                        .del();
                    continue;
                }

                const definition = getFieldType(field.type)!;
                const stored = z.encode(definition.codec, value);
                const now = new Date();
                await trx('member_custom_field_values')
                    .insert({
                        id: new ObjectID().toHexString(),
                        member_custom_field_id: field.id,
                        member_id: memberId,
                        [definition.column]: stored,
                        created_at: now
                    })
                    .onConflict(['member_custom_field_id', 'member_id'])
                    .merge({[definition.column]: stored, updated_at: now});
            }
        };

        if (options.transacting) {
            return run(options.transacting);
        }
        return this.knex.transaction(run);
    }

    private async loadFieldsByKey(exec: Knex): Promise<Map<string, FieldRef>> {
        const rows = await exec('member_custom_fields').select('id', 'key', 'type');
        const byKey = new Map<string, FieldRef>();
        for (const row of rows) {
            byKey.set(row.key, {id: row.id, type: row.type});
        }
        return byKey;
    }

    private assertValid(values: CustomFieldValueMap, fieldsByKey: Map<string, FieldRef>): void {
        if (values === null || typeof values !== 'object' || Array.isArray(values)) {
            throw new errors.ValidationError({
                message: 'custom_fields must be an object mapping field keys to values.',
                property: 'custom_fields'
            });
        }

        const invalid: string[] = [];
        for (const [key, value] of Object.entries(values)) {
            const field = fieldsByKey.get(key);
            if (!field) {
                invalid.push(`Unknown custom field: ${key}`);
                continue;
            }
            if (value === null) {
                continue;
            }
            const definition = getFieldType(field.type);
            if (!definition || !z.safeEncode(definition.codec, value).success) {
                invalid.push(`Invalid value for custom field: ${key}`);
            }
        }

        if (invalid.length > 0) {
            throw new errors.ValidationError({
                message: 'One or more custom field values could not be saved.',
                context: invalid.join(' '),
                property: 'custom_fields'
            });
        }
    }
}

function isUniqueConstraintViolation(error: unknown): boolean {
    const code = (error as {code?: string})?.code;
    return code === 'ER_DUP_ENTRY' || code === 'SQLITE_CONSTRAINT';
}
