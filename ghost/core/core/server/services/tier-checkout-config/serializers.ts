import {z} from 'zod';
import {MAX_CHECKOUT_CUSTOM_FIELDS} from '../stripe/services/checkout/field-ports';
import {CheckoutConfigResult} from './models';

/**
 * The wire shape, both ways.
 *
 * Each collectable thing is its own named block rather than a row in a list, matching the
 * shape a screen renders: a checkbox, the field it is kept in, and whatever else that
 * particular thing needs. The options differ per kind — only an address needs countries —
 * and a list would carry a key meaning nothing on most of its entries.
 *
 * No processor appears anywhere in it. Which one renders the checkout is not a publisher's
 * choice, so a port is Ghost's word for the kind of thing rather than a processor's word
 * for a parameter.
 */

const QuestionInput = z.object({
    key: z.string().min(1, {error: 'Every checkout question needs a custom field key.'}),
    label: z.string().trim().min(1).nullish(),
    optional: z.boolean().optional()
});
export type QuestionInput = z.infer<typeof QuestionInput>;

// Same shape rule as the address type's country part, and deliberately not checked against
// a list of countries: membership of that list is contested, and Ghost is not the arbiter
// of it. Case is normalised so `gb` and `GB` are not two values for one place.
const CountryCode = z.string().trim()
    .regex(/^[A-Za-z]{2}$/, {error: 'Enter a 2-letter country code, like US.'})
    .toUpperCase();

/**
 * Turning collection on names where it is kept, in the same statement.
 *
 * A refinement rather than a check further in, because it is a rule about the shape of the
 * request and nothing else — no field has to exist yet for it to be wrong. Whether the
 * field it names is real, active and of the right type needs the database, so that is
 * settled at the write.
 */
const keptSomewhere = <T extends {collect: boolean; custom_field_key?: string}>(block: T, ctx: z.RefinementCtx) => {
    if (block.collect && !block.custom_field_key) {
        ctx.addIssue({
            code: 'custom',
            path: ['custom_field_key'],
            message: 'Choose where this should be kept.'
        });
    }
};

/**
 * One block per kind of thing a checkout collects, each naming its own options.
 *
 * Stated rather than left open, so the schema is the contract: it says which kinds of thing
 * exist and that only an address takes a country list. A client builds a payload from this
 * and needs to be told nothing else, which is why none of it is also served as data.
 *
 * Each block is replaced only if the request names it, so a client that knows about the
 * questions cannot erase a collection by staying silent about it.
 */
export const CheckoutConfigInput = z.strictObject({
    custom_fields: z.array(QuestionInput)
        .max(MAX_CHECKOUT_CUSTOM_FIELDS, {error: `A checkout can ask at most ${MAX_CHECKOUT_CUSTOM_FIELDS} questions.`})
        .refine(
            questions => new Set(questions.map(question => question.key)).size === questions.length,
            {error: 'This checkout already asks for that field.'}
        )
        .optional(),

    /**
     * One toggle for the shipping step, and a destination for each thing it returns.
     *
     * A processor collects the recipient and the address under one parameter, so a
     * publisher ticks one box; where each lands is two choices, because a name is a name
     * and an address is an address. Leaving `name` out keeps no name — the checkout still
     * asks for one, and Ghost discards it.
     */
    shipping: z.strictObject({
        collect: z.boolean(),
        allowed_countries: z.array(CountryCode).optional(),
        name: z.strictObject({custom_field_key: z.string().min(1)}).optional(),
        address: z.strictObject({custom_field_key: z.string().min(1)}).optional()
    }).superRefine((block, ctx) => {
        if (!block.collect) {
            return;
        }
        if (!block.address) {
            ctx.addIssue({
                code: 'custom',
                path: ['address', 'custom_field_key'],
                message: 'Choose where the shipping address should be kept.'
            });
        }
        // An address form cannot be rendered without knowing which countries to offer, so a
        // publisher naming none has configured a collection that cannot happen.
        if (!block.allowed_countries?.length) {
            ctx.addIssue({
                code: 'custom',
                path: ['allowed_countries'],
                message: 'Choose at least one country you deliver to.'
            });
        }
    }).optional(),

    tax_number: z.strictObject({
        collect: z.boolean(),
        custom_field_key: z.string().min(1).optional()
    }).superRefine(keptSomewhere).optional(),

    phone: z.strictObject({
        collect: z.boolean(),
        custom_field_key: z.string().min(1).optional()
    }).superRefine(keptSomewhere).optional()
});
export type CheckoutConfigInput = z.infer<typeof CheckoutConfigInput>;

const QuestionResource = z.object({
    key: z.string(),
    label: z.string().nullable(),
    optional: z.boolean()
});

/** A block appears only when the tier collects that thing, so `collect` is always true. */
const CollectionResource = z.object({
    collect: z.literal(true),
    custom_field_key: z.string().nullable()
});

/**
 * The same blocks a write states, so a response can be edited and handed straight back.
 *
 * Stated rather than open for the same reason the input is: the schema is what tells a
 * client which kinds of thing exist and which of them carries a country list.
 */
const ShippingResource = z.object({
    collect: z.literal(true),
    allowed_countries: z.array(z.string()),
    // Always present so a form can bind to them; a null key is a thing not kept anywhere.
    name: z.object({custom_field_key: z.string().nullable()}),
    address: z.object({custom_field_key: z.string().nullable()})
});

const CheckoutConfigResource = z.object({
    tier_id: z.string(),
    custom_fields: z.array(QuestionResource),
    shipping: ShippingResource.optional(),
    tax_number: CollectionResource.optional(),
    phone: CollectionResource.optional()
});

const CheckoutConfigResponse = z.object({
    tiers_checkout_config: z.array(CheckoutConfigResource)
});

/** One resource per tier, so a browse and a read differ only in how many come back. */
export const toCheckoutConfigResponse = CheckoutConfigResult
    .transform((result): z.input<typeof CheckoutConfigResponse> => ({
        tiers_checkout_config: result.tiers.map(config => ({
            tier_id: config.tierId,
            custom_fields: config.customFields,
            // A block appears only when the tier collects that thing, so a client reads
            // presence rather than a flag it would have to check.
            ...(config.shipping ? {shipping: {
                collect: true as const,
                allowed_countries: config.shipping.allowedCountries,
                name: {custom_field_key: config.shipping.nameCustomFieldKey},
                address: {custom_field_key: config.shipping.addressCustomFieldKey}
            }} : {}),
            ...(config.taxNumber ? {tax_number: {
                collect: true as const,
                custom_field_key: config.taxNumber.customFieldKey
            }} : {}),
            ...(config.phone ? {phone: {
                collect: true as const,
                custom_field_key: config.phone.customFieldKey
            }} : {})
        }))
    }))
    .pipe(CheckoutConfigResponse);
