import {z} from 'zod';

/**
 * The shared catalog of member custom field types.
 *
 * Single source of truth for two tier-neutral facts about a field type: which
 * storage type its value lives in, and how a value is validated. Ghost core
 * imports it to *enforce* validation (and to route storage); admin imports the
 * same schemas for instant form feedback. Neither drifts.
 *
 * It is deliberately pure data: no presentation (labels, icons, input controls
 * stay in the frontend), no storage codecs (columns and serialize/deserialize
 * stay in the backend), and no lookup helpers (consumers index `FIELD_TYPES`
 * directly). Keeping it pure keeps the backend's dependency surface clean and
 * means its behaviour is proven where it matters — the members custom-fields
 * HTTP API integration tests — rather than in isolated unit tests here.
 */

/**
 * Storage types: the small, closed set of database columns a value can live in.
 * The backend owns the column and its serialize/deserialize per storage type;
 * everything here only needs to know which one a field type routes to.
 */
export type StorageType = 'text' | 'json';

/**
 * Field types: the open, growing set a publisher picks. Many field types share
 * one storage type (short_text and long_text both store as text), yet each
 * carries its own validation even when the storage is identical — which is why
 * validation hangs off the field type, not the storage type. Declared once here
 * as the source for the union type, the zod enum, and the FIELD_TYPES keys.
 */
export const FIELD_TYPE_IDS = ['short_text', 'long_text', 'address'] as const;
export type FieldType = typeof FIELD_TYPE_IDS[number];
export const FieldTypeSchema = z.enum(FIELD_TYPE_IDS);

export interface FieldTypeDefinition {
    /** The storage column a value of this type is persisted in (backend concern). */
    storageType: StorageType;
    /**
     * The authoritative validation for a value of this type. The backend runs it
     * as the gate; the frontend runs the same schema for instant feedback.
     */
    value: z.ZodType;
}

/**
 * The address value — a composite type, modelled on Stripe's Address object.
 * line2 and state are optional. Because it is one zod object, invalid sub-fields
 * surface per path (the caller can point at `postal_code` specifically) with no
 * bespoke composite handling.
 */
export const AddressValue = z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().optional(),
    postal_code: z.string().min(1),
    // Two characters only — the shape of an ISO 3166-1 alpha-2 code, not validated
    // against the actual country list (kept light until values are stored).
    country: z.string().length(2)
});
export type Address = z.infer<typeof AddressValue>;

export const FIELD_TYPES = {
    short_text: {storageType: 'text', value: z.string().max(255)},
    // Bound is in characters; the text storage column is limited in bytes, so a
    // tighter byte-aware bound may be needed once values are actually stored.
    long_text: {storageType: 'text', value: z.string().max(65535)},
    address: {storageType: 'json', value: AddressValue}
} as const satisfies Record<FieldType, FieldTypeDefinition>;
