import {FIELD_TYPES, type FieldType, type StorageType} from '@tryghost/custom-field-types';

// The backend half of the storage-type contract: the catalog says which storage
// type a field type routes to, and this says what that means in the database —
// the column, and how a value crosses the boundary. Adding a field type that
// reuses an existing storage type needs nothing here.

export type ValueColumn = 'value_text' | 'value_json';

interface StorageCodec {
    column: ValueColumn;
    encode(value: unknown): string;
    decode(stored: string): unknown;
}

const STORAGE_CODECS = {
    // The value is already a string by the time it gets here — the field type's
    // schema validated it — so encoding is identity.
    text: {
        column: 'value_text',
        encode: value => String(value),
        decode: stored => stored
    },
    json: {
        column: 'value_json',
        encode: value => JSON.stringify(value),
        decode: stored => JSON.parse(stored)
    }
} as const satisfies Record<StorageType, StorageCodec>;

export function storageCodecFor(type: FieldType): StorageCodec {
    return STORAGE_CODECS[FIELD_TYPES[type].storageType];
}

/**
 * The value columns for a row, with the one this field type doesn't use
 * explicitly nulled — the "exactly one column populated" invariant is written
 * out on every insert and update rather than left to convention.
 */
export function storageColumnsFor(type: FieldType, value: unknown): Record<ValueColumn, string | null> {
    const codec = storageCodecFor(type);
    return {
        value_text: null,
        value_json: null,
        [codec.column]: codec.encode(value)
    };
}
