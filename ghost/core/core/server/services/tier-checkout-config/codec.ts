import { z } from 'zod';
import { DbBoolean } from '../../lib/db-types/boolean';
import { DbCheckoutOptions } from './schema';
import { CheckoutOptions } from './models';

const SEPARATOR = ',';

export const optionsCodec = z.codec(DbCheckoutOptions, CheckoutOptions, {
  // An absent list is everywhere, so the column is null rather than a copy of every
  // country. An empty list is neither, and stays representable on purpose: nothing writes
  // one, and the session builder refuses to collect against it rather than asking the
  // processor for an address form it would never render.
  decode: (columns) => ({
    shippingAllowedCountries:
      columns.shipping_allowed_countries === null
        ? null
        : splitList(columns.shipping_allowed_countries),
    taxNumber: columns.tax_number_collect,
  }),
  encode: (options) => ({
    shipping_allowed_countries:
      options.shippingAllowedCountries === null ? null : joinList(options.shippingAllowedCountries),
    tax_number_collect: options.taxNumber,
  }),
});

function splitList(stored: string): string[] {
  return stored.split(SEPARATOR).filter(Boolean);
}

function joinList(values: string[]): string {
  return [...new Set(values)].join(SEPARATOR);
}

export const CollectionRow = z.object({
  product_id: z.string(),
  config_id: z.string().nullable(),

  shipping_allowed_countries: z.string().nullable(),
  tax_number_collect: DbBoolean.nullable(),

  shipping_name_key: z.string().nullable(),
  shipping_name_collectable: z.string().nullable(),
  shipping_address_key: z.string().nullable(),
  shipping_address_collectable: z.string().nullable(),
  phone_key: z.string().nullable(),
  phone_collectable: z.string().nullable(),
});
export type CollectionRow = z.input<typeof CollectionRow>;

export const collectionRowCodec = CollectionRow.transform((row) => {
  const collection = collectedInto(row);

  return {
    tierId: row.product_id,
    configured: row.config_id !== null,
    collection,
    collecting: {
      // Stripe collects the recipient's name and their address under one parameter, so it
      // asks for both or neither. Archiving one of the two destinations is the publisher
      // saying they no longer want that half: the step is still worth asking for while the
      // other half can land, and whatever arrives for the archived one is dropped. Only
      // archiving both leaves nothing worth asking for.
      shipping:
        row.shipping_name_collectable === null && row.shipping_address_collectable === null
          ? null
          : collection.shipping,
      taxNumber: collection.taxNumber,
      phone: row.phone_collectable === null ? null : collection.phone,
    },
  };
});
export type CollectionParts = z.infer<typeof collectionRowCodec>;

function collectedInto(row: z.output<typeof CollectionRow>) {
  const { shippingAllowedCountries, taxNumber } = z.decode(optionsCodec, {
    shipping_allowed_countries: row.shipping_allowed_countries,
    tax_number_collect: row.tax_number_collect ?? false,
  });

  return {
    shipping:
      row.shipping_name_key !== null && row.shipping_address_key !== null
        ? {
            allowedCountries: shippingAllowedCountries,
            nameCustomFieldKey: row.shipping_name_key,
            addressCustomFieldKey: row.shipping_address_key,
          }
        : null,
    taxNumber,
    phone: row.phone_key === null ? null : { customFieldKey: row.phone_key },
  };
}
