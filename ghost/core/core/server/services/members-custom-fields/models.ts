import {z} from 'zod';

// An unqualified key always means the publisher namespace. Dots are reserved for a
// future `namespace.key` form, so a bare key may not contain them.
export const CustomFieldKey = z.string().regex(/^[a-z][a-z0-9_]*$/, {
    message: 'Custom field keys must be lowercase and may only contain letters, numbers and underscores.'
});

// `type` is a first-class property of a field: behaviour branches on it via the
// registry below, never "all fields are text". A new type is an additive enum
// entry plus a registry entry plus a typed value column.
export const FieldType = z.enum(['text']);
export type FieldType = z.infer<typeof FieldType>;

// The domain shape of a field definition (camelCase; distinct from the DB row).
export const CustomField = z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    type: FieldType,
    createdAt: z.date(),
    updatedAt: z.date().nullable()
});
export type CustomField = z.infer<typeof CustomField>;

// The publisher-facing value map as it appears on the members API wire format:
// bare keys, `null` clears a value.
export type CustomFieldValueMap = Record<string, unknown>;

/**
 * Field-type registry — code, not a table. A type carries behaviour, split into
 * two concerns: `column` is *where* the value is stored (routing), `codec` is
 * *how* it maps to and from that column (transform + validation). v1 routes `text`
 * to `value_text`.
 */
export type ValueColumn = 'value_text';

export interface FieldTypeDefinition {
    column: ValueColumn;
    // Stored string <-> domain value. Decoding reads a stored column value into
    // its runtime form; encoding validates an incoming value against the domain
    // schema and produces the string to persist. A new type is a new codec here
    // plus (if it needs one) a new typed column. The stored side is a string
    // because every value column is text today.
    codec: z.ZodCodec<z.ZodString, z.ZodType>;
}

export const FIELD_TYPE_REGISTRY: Record<FieldType, FieldTypeDefinition> = {
    text: {
        column: 'value_text',
        codec: z.codec(z.string(), z.string(), {
            decode: stored => stored,
            encode: value => value
        })
    }
};

export function getFieldType(type: string): FieldTypeDefinition | undefined {
    return Object.prototype.hasOwnProperty.call(FIELD_TYPE_REGISTRY, type)
        ? FIELD_TYPE_REGISTRY[type as FieldType]
        : undefined;
}
