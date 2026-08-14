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
 * Long text is bounded in bytes, not characters, because the storage column it
 * routes to is bounded in bytes (MySQL TEXT holds 65,535 of them). A character
 * bound would accept a multibyte value that the column then can't hold: 65,535
 * emoji is four times over. Shopify documents its metafield limits in bytes for
 * the same reason.
 *
 * TextEncoder rather than Buffer: this package runs in the browser too.
 */
export const MAX_LONG_TEXT_BYTES = 65535;

const byteLength = (value: string): number => new TextEncoder().encode(value).length;

/**
 * The address value — a composite type, modelled on Stripe's Address object.
 * line2 and state are optional. Because it is one zod object, invalid sub-fields
 * surface per path (the caller can point at `postal_code` specifically) with no
 * bespoke composite handling.
 *
 * Every sub-field is bounded. An address is a delivery address, so the bounds are
 * set by what a courier will accept, not by what the column could hold — and a
 * composite with unbounded members is a composite with no bound at all.
 */
export const AddressValue = z.object({
    line1: z.string().min(1).max(255),
    line2: z.string().max(255).optional(),
    city: z.string().min(1).max(255),
    state: z.string().max(255).optional(),
    postal_code: z.string().min(1).max(32),
    // Two characters only — the shape of an ISO 3166-1 alpha-2 code, not validated
    // against the actual country list.
    country: z.string().length(2)
});
export type Address = z.infer<typeof AddressValue>;

export const FIELD_TYPES = {
    // Characters, not bytes: 255 of anything fits the column with room to spare,
    // and a character count is the limit a publisher can reason about.
    short_text: {storageType: 'text', value: z.string().max(255)},
    long_text: {
        storageType: 'text',
        value: z.string().refine(value => byteLength(value) <= MAX_LONG_TEXT_BYTES, {
            message: `Value must be at most ${MAX_LONG_TEXT_BYTES} bytes.`
        })
    },
    address: {storageType: 'json', value: AddressValue}
} as const satisfies Record<FieldType, FieldTypeDefinition>;
