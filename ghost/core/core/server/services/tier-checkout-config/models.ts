import {z} from 'zod';
import {FieldTypeSchema} from '@tryghost/custom-field-types';

/**
 * What a tier's checkout page asks, over and above the payment itself.
 *
 * ## The rule this domain lives by
 *
 * A tier says what its checkout asks. Where the answers land is either already settled or
 * settled site-wide, and never here. A question's answer comes back under the key Ghost
 * sent with it, so the field a publisher picked *is* the destination — there is nothing to
 * bind, and this is a selection. What a processor collects under its own vocabulary comes
 * back with no key at all, so a tier can only say whether to collect it; the binding says
 * where it goes.
 *
 * ## Why this is not the Tier aggregate
 *
 * A tier is loaded into memory once at boot and served from there. These rows are not:
 * deleting a custom field cascades a question away without the tier repository ever seeing
 * it, so a cached copy would go on naming a field the site no longer has. Nothing here is
 * a tier invariant either — pricing, naming and status are what that aggregate protects,
 * and none of them touch this.
 */

/** One question, addressed by the field it is asked into. */
export const CheckoutQuestion = z.object({
    key: z.string(),
    /** Null asks under the field's own name. */
    label: z.string().nullable(),
    optional: z.boolean()
});
export type CheckoutQuestion = z.infer<typeof CheckoutQuestion>;

/**
 * What a tier collects for itself, written out one member at a time.
 *
 * Not a list of a shared shape. An address has to know which countries to offer and a phone
 * number does not, and the next thing a checkout learns to collect will need something
 * neither of them does. They look alike today by coincidence, and a shared shape would turn
 * that coincidence into a rule — every difference would then have to go into an options bag
 * nobody can constrain.
 *
 * Absent means not collected, so there is no flag to read: the block exists or it does not.
 */
/**
 * What a tier collects at the shipping step.
 *
 * One toggle and two destinations. A processor collects the recipient and the address
 * together under one parameter, so whether to ask is one choice; where each lands is two,
 * because a name and an address are different things and a publisher keeps them in
 * different fields.
 */
export const ShippingCollection = z.object({
    /**
     * ISO 3166-1 alpha-2 codes. An address form cannot be rendered without a country list,
     * and Ghost holds no list of its own — which countries exist is contested, and guessing
     * at a processor's accepted set risks failing a checkout.
     */
    allowedCountries: z.array(z.string()),
    /** Where the recipient's name is kept, or null when the site does not keep it. */
    nameCustomFieldKey: z.string().nullable(),
    /** Where the address is kept. Null means nothing will be collected into it. */
    addressCustomFieldKey: z.string().nullable()
});
export type ShippingCollection = z.infer<typeof ShippingCollection>;

export const TaxNumberCollection = z.object({
    customFieldKey: z.string().nullable()
});
export type TaxNumberCollection = z.infer<typeof TaxNumberCollection>;

export const PhoneCollection = z.object({
    customFieldKey: z.string().nullable()
});
export type PhoneCollection = z.infer<typeof PhoneCollection>;

/**
 * A tier's whole checkout configuration: everything it asks, everything it collects, and
 * where each collected thing is kept.
 *
 * The one shape this domain hands out and takes back. That it spans two tables, and that
 * destinations live in a binding at all, are facts about the inside.
 */
export const TierCheckoutConfig = z.object({
    tierId: z.string(),
    customFields: z.array(CheckoutQuestion),
    shipping: ShippingCollection.nullable(),
    taxNumber: TaxNumberCollection.nullable(),
    phone: PhoneCollection.nullable()
});
export type TierCheckoutConfig = z.infer<typeof TierCheckoutConfig>;

export const emptyCheckoutConfig = (tierId: string): TierCheckoutConfig => ({
    tierId,
    customFields: [],
    shipping: null,
    taxNumber: null,
    phone: null
});

/**
 * The same thing as the tier's own row holds it: no destinations, because where a value
 * lands is site-wide rather than per tier. Internal to the domain.
 */
export const StoredCollection = z.object({
    shipping: z.object({allowedCountries: z.array(z.string())}).nullable(),
    taxNumber: z.boolean(),
    phone: z.boolean()
});
export type StoredCollection = z.infer<typeof StoredCollection>;

export const StoredCheckout = z.object({
    customFields: z.array(CheckoutQuestion),
    collect: StoredCollection
});
export type StoredCheckout = z.infer<typeof StoredCheckout>;

export const emptyStoredCheckout = (): StoredCheckout => ({
    customFields: [],
    collect: {shipping: null, taxNumber: false, phone: false}
});

/** Whether a tier collects anything at all, which is what makes it worth returning. */
export const collectsSomething = (collect: StoredCollection): boolean =>
    collect.shipping !== null || collect.taxNumber || collect.phone;

/**
 * What one read of this domain answers with.
 *
 * Only tiers. What a checkout *could* collect and how much it renders are static per build,
 * so they are stated by the request and response schemas rather than served as data.
 */
export const CheckoutConfigResult = z.object({
    tiers: z.array(TierCheckoutConfig)
});
export type CheckoutConfigResult = z.infer<typeof CheckoutConfigResult>;

/** A question resolved against the live catalog, as a session builder needs it. */
export const ResolvedQuestion = CheckoutQuestion.extend({
    /** What the question is actually asked under: the label, or the field's name. */
    prompt: z.string(),
    type: FieldTypeSchema
});
export type ResolvedQuestion = z.infer<typeof ResolvedQuestion>;

/** What a checkout should actually ask right now: everything unusable already dropped. */
export const ResolvedCheckout = z.object({
    customFields: z.array(ResolvedQuestion),
    shipping: ShippingCollection.nullable(),
    taxNumber: TaxNumberCollection.nullable(),
    phone: PhoneCollection.nullable()
});
export type ResolvedCheckout = z.infer<typeof ResolvedCheckout>;
