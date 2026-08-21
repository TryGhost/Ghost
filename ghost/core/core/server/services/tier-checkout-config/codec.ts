import {z} from 'zod';
import {FieldTypeSchema} from '@tryghost/custom-field-types';
import {DbBoolean, DbCheckoutCollection, DbCheckoutQuestion} from './schema';
import {CheckoutQuestion, StoredCollection} from './models';

const SEPARATOR = ',';

/**
 * What a read needs to rebuild a question: the question's own columns, plus the port off the
 * binding it hangs from. The port is what the question is asked under, and for a checkout
 * question that is the publisher's own field key — which is what makes the answer
 * recognisable when Stripe hands it back.
 */
export const CheckoutQuestionRow = DbCheckoutQuestion
    .pick({label: true, optional: true})
    .extend({port: z.string()});
export type CheckoutQuestionRow = z.infer<typeof CheckoutQuestionRow>;

/** A question row and the domain question, both ways. */
export const checkoutQuestionCodec = z.codec(CheckoutQuestionRow, CheckoutQuestion, {
    decode: row => ({key: row.port, label: row.label, optional: row.optional}),
    encode: question => ({
        port: question.key,
        label: question.label,
        optional: question.optional
    })
});

/**
 * A tier's collection columns and what it collects, both ways.
 *
 * The only place a column name meets a domain name, so a caller hands over a whole
 * collection and never learns how it is stored. Encoding states every column: the object is
 * the whole truth about what a tier collects, so anything absent from it is off.
 */
export const collectionCodec = z.codec(DbCheckoutCollection, StoredCollection, {
    decode: columns => ({
        shipping: columns.shipping_collect
            ? {allowedCountries: splitList(columns.shipping_allowed_countries)}
            : null,
        taxNumber: columns.tax_number_collect,
        phone: columns.phone_collect
    }),
    encode: collect => ({
        shipping_collect: collect.shipping !== null,
        // Cleared when shipping is not collected, so turning it back on cannot quietly
        // resume delivering somewhere the publisher has since stopped.
        shipping_allowed_countries: collect.shipping?.allowedCountries.length
            ? joinList(collect.shipping.allowedCountries)
            : null,
        tax_number_collect: collect.taxNumber,
        phone_collect: collect.phone
    })
});

function splitList(stored: string | null): string[] {
    return stored ? stored.split(SEPARATOR).filter(Boolean) : [];
}

function joinList(values: string[]): string {
    return [...new Set(values)].join(SEPARATOR);
}

/**
 * Every column the joined read returns.
 *
 * All but the tier's own id are nullable, because every join is LEFT: a tier may ask no
 * questions, may have no configuration row, and may have nothing bound. The definitions are
 * joined on being active as well as on their key, so a null `question_name` covers both "no
 * question here" and "its field has been archived" — which is the same answer.
 */
export const CheckoutRow = z.object({
    product_id: z.string(),

    // A question's own columns, plus the port and destination off the binding it hangs from.
    // `port` is non-null whenever the tier has any binding at all, so `label`/`optional` are
    // what say a binding carries a question rather than a collected thing.
    port: z.string().nullable(),
    question_key: z.string().nullable(),
    label: z.string().nullable(),
    optional: DbBoolean.nullable(),
    question_name: z.string().nullable(),
    question_type: FieldTypeSchema.nullable(),

    shipping_collect: DbBoolean.nullable(),
    shipping_allowed_countries: z.string().nullable(),
    tax_number_collect: DbBoolean.nullable(),
    phone_collect: DbBoolean.nullable(),

    shipping_name_key: z.string().nullable(),
    shipping_name_collectable: z.string().nullable(),
    shipping_address_key: z.string().nullable(),
    shipping_address_collectable: z.string().nullable(),
    tax_number_key: z.string().nullable(),
    tax_number_collectable: z.string().nullable(),
    phone_key: z.string().nullable(),
    phone_collectable: z.string().nullable()
});
export type CheckoutRow = z.input<typeof CheckoutRow>;

/**
 * One row, read as the parts of an aggregate it carries.
 *
 * The branching that decides what a row contributes lives here rather than in the walk that
 * groups them, so grouping is left with nothing to decide. Each part delegates to the codec
 * that already owns its mapping, which is also what lets the columns be handed over by name
 * instead of cast.
 */
export const checkoutRowCodec = CheckoutRow.transform((row) => {
    // Null when the tier has no configuration row at all, which is not the same as having
    // turned everything off. Read once; both shapes below are views of it.
    const collection = row.shipping_collect === null
        ? null
        : withDestinations(storedCollection(row), row);

    return {
        tierId: row.product_id,

        /** The question as configured, whatever became of the field since. */
        question: row.optional === null ? null : z.decode(checkoutQuestionCodec, {
            port: row.port!,
            label: row.label,
            optional: row.optional
        }),

        /** What it takes to actually ask it, absent once the field is no longer active. */
        askable: row.question_type === null ? null : {
            prompt: row.label ?? row.question_name!,
            type: row.question_type
        },

        /** What the tier is configured to collect, and where each is kept. */
        collection,

        /**
         * The same, minus anything with nowhere active to put it — what a checkout should
         * actually ask for.
         *
         * Stated here rather than worked out by a caller, because the join already answered
         * it: a destination whose field has been archived came back with no key, and
         * collecting something to throw away is worse than not asking.
         */
        collecting: {
            // Asked for while anything it returns still has somewhere to go. Each
            // destination drops out on its own below, so an archived one costs that part
            // and no more — the same way an archived field costs one question rather than
            // the whole list. Only when neither can land is asking pointless.
            shipping: row.shipping_name_collectable === null && row.shipping_address_collectable === null
                ? null
                : collection?.shipping ?? null,
            taxNumber: row.tax_number_collectable === null ? null : collection?.taxNumber ?? null,
            phone: row.phone_collectable === null ? null : collection?.phone ?? null
        }
    };
});
export type CheckoutRowParts = z.infer<typeof checkoutRowCodec>;

/** The collection columns, read through the codec that owns their mapping. */
function storedCollection(row: z.output<typeof CheckoutRow>): StoredCollection {
    return z.decode(collectionCodec, {
        shipping_collect: row.shipping_collect!,
        shipping_allowed_countries: row.shipping_allowed_countries,
        tax_number_collect: row.tax_number_collect!,
        phone_collect: row.phone_collect!
    });
}

/** What the tier's row says it collects, plus where the site currently keeps each. */
function withDestinations(collect: StoredCollection, row: z.output<typeof CheckoutRow>) {
    return {
        shipping: collect.shipping && {
            allowedCountries: collect.shipping.allowedCountries,
            // Null when nothing is bound, or when what is bound has since been archived —
            // the join answered both by handing back no key.
            nameCustomFieldKey: row.shipping_name_collectable === null ? null : row.shipping_name_key,
            addressCustomFieldKey: row.shipping_address_collectable === null ? null : row.shipping_address_key
        },
        taxNumber: collect.taxNumber ? {customFieldKey: row.tax_number_key} : null,
        phone: collect.phone ? {customFieldKey: row.phone_key} : null
    };
}
