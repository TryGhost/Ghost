import { z } from 'zod';
import { FieldTypeSchema } from '@tryghost/custom-field-types';
import { DbBoolean } from '../../lib/db-types/boolean';
import { DbCheckoutOptions, DbCheckoutQuestion } from './schema';
import { CheckoutOptions } from './models';

const SEPARATOR = ',';

export const CheckoutQuestionRow = DbCheckoutQuestion.pick({ label: true, optional: true }).extend({
  port: z.string(),
});
export type CheckoutQuestionRow = z.infer<typeof CheckoutQuestionRow>;

export const checkoutQuestionCodec = CheckoutQuestionRow.transform((row) => ({
  key: row.port,
  label: row.label,
  optional: row.optional,
}));

export const optionsCodec = z.codec(DbCheckoutOptions, CheckoutOptions, {
  decode: (columns) => ({
    shippingAllowedCountries: splitList(columns.shipping_allowed_countries),
    taxNumber: columns.tax_number_collect,
  }),
  encode: (options) => ({
    shipping_allowed_countries: options.shippingAllowedCountries.length
      ? joinList(options.shippingAllowedCountries)
      : null,
    tax_number_collect: options.taxNumber,
  }),
});

function splitList(stored: string | null): string[] {
  return stored ? stored.split(SEPARATOR).filter(Boolean) : [];
}

function joinList(values: string[]): string {
  return [...new Set(values)].join(SEPARATOR);
}

/**
 * All but the tier's own id are nullable, because every join is LEFT and the definition
 * joins carry `status` in their ON clause — so a null name covers both "nothing here" and
 * "its field is archived", which mean the same to every reader.
 */
export const CheckoutRow = z.object({
  product_id: z.string(),

  // `port` is set for any binding, so `optional` is what says this one carries a question.
  port: z.string().nullable(),
  question_key: z.string().nullable(),
  label: z.string().nullable(),
  optional: DbBoolean.nullable(),
  question_name: z.string().nullable(),
  question_type: FieldTypeSchema.nullable(),

  shipping_allowed_countries: z.string().nullable(),
  tax_number_collect: DbBoolean.nullable(),

  shipping_name_key: z.string().nullable(),
  shipping_name_collectable: z.string().nullable(),
  shipping_address_key: z.string().nullable(),
  shipping_address_collectable: z.string().nullable(),
  phone_key: z.string().nullable(),
  phone_collectable: z.string().nullable(),
});
export type CheckoutRow = z.input<typeof CheckoutRow>;

export const checkoutRowCodec = CheckoutRow.transform((row) => {
  const collection = collectedInto(row);

  return {
    tierId: row.product_id,

    question:
      row.optional === null
        ? null
        : z.decode(checkoutQuestionCodec, {
            port: row.port!,
            label: row.label,
            optional: row.optional,
          }),

    askable:
      row.question_type === null
        ? null
        : {
            prompt: row.label ?? row.question_name!,
            type: row.question_type,
          },

    collection,

    /** The same, minus anything with nowhere active to put it. */
    collecting: {
      // One parameter returns both, so it is worth asking while either can still land.
      shipping:
        row.shipping_name_collectable === null && row.shipping_address_collectable === null
          ? null
          : collection.shipping,
      taxNumber: collection.taxNumber,
      phone: row.phone_collectable === null ? null : collection.phone,
    },
  };
});
export type CheckoutRowParts = z.infer<typeof checkoutRowCodec>;

/**
 * An archived destination still reports its key, because archiving is reversible. What it
 * costs now is `collecting` above, which is what a checkout is built from.
 */
function collectedInto(row: z.output<typeof CheckoutRow>) {
  const { shippingAllowedCountries, taxNumber } = z.decode(optionsCodec, {
    shipping_allowed_countries: row.shipping_allowed_countries,
    tax_number_collect: row.tax_number_collect ?? false,
  });
  const collectsShipping = row.shipping_name_key !== null || row.shipping_address_key !== null;

  return {
    shipping: collectsShipping
      ? {
          allowedCountries: shippingAllowedCountries,
          nameCustomFieldKey: row.shipping_name_collectable === null ? null : row.shipping_name_key,
          addressCustomFieldKey:
            row.shipping_address_collectable === null ? null : row.shipping_address_key,
        }
      : null,
    taxNumber,
    phone: row.phone_key === null ? null : { customFieldKey: row.phone_key },
  };
}
