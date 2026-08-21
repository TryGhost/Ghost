import {z} from 'zod';
import type {Knex} from 'knex';
import {DbDate} from '../../lib/db-date';

/**
 * SQLite hands a boolean back as 0 or 1 and MySQL as a boolean, so every read normalises.
 * Local to this domain until a second one needs it, at which point it belongs beside
 * `DbDate` in lib.
 */
export const DbBoolean = z.codec(z.union([z.boolean(), z.number()]), z.boolean(), {
    decode: stored => Boolean(stored),
    encode: value => value
});

/**
 * One question a tier's checkout asks, as stored.
 *
 * Rows rather than columns, because a publisher invents the fields, names them and puts
 * them in an order. That is an open set, and only rows can hold one.
 *
 * Only what is true of a *question*. Where the answer lands is the binding this hangs off,
 * the same binding an address is routed through, so nothing here names a field.
 */
export const DbCheckoutQuestion = z.object({
    id: z.string(),
    binding_id: z.string(),
    // Storage only: the order is a fact about the list, so no read projection carries a rank.
    sort_order: z.number(),
    label: z.string().nullable(),
    optional: DbBoolean,
    created_at: DbDate,
    updated_at: DbDate.nullable()
});

/**
 * What a tier's checkout collects for itself, as stored: one row per tier, one column
 * group per kind of thing.
 *
 * Columns rather than rows, because that set is closed — only a Ghost release adds the
 * ability to collect an address, and it arrives with the code that knows how to. A generic
 * row would have to hold every kind's options, most of them meaningless on any given row,
 * with no constraint able to say which belonged where.
 */
export const DbCheckoutConfig = z.object({
    id: z.string(),
    product_id: z.string(),
    shipping_collect: DbBoolean,
    // ISO 3166-1 alpha-2 codes, comma-joined: a value rather than a set of rows to query.
    shipping_allowed_countries: z.string().nullable(),
    tax_number_collect: DbBoolean,
    phone_collect: DbBoolean,
    created_at: DbDate,
    updated_at: DbDate.nullable()
});

type CheckoutConfigRow = z.infer<typeof DbCheckoutConfig>;

/** The columns that say what is collected, without the identity and timestamps around them. */
export const DbCheckoutCollection = DbCheckoutConfig.omit({
    id: true,
    product_id: true,
    created_at: true,
    updated_at: true
});
export type DbCheckoutCollection = z.infer<typeof DbCheckoutCollection>;

declare module 'knex/types/tables' {
    interface Tables {
        products_checkout_fields: Knex.CompositeTableType<
            z.infer<typeof DbCheckoutQuestion>,
            Omit<z.input<typeof DbCheckoutQuestion>, 'updated_at'>,
            Partial<z.infer<typeof DbCheckoutQuestion>>
        >;
        products_checkout_config: Knex.CompositeTableType<
            CheckoutConfigRow,
            // Every flag is DB-defaulted, so an insert may state only the ones it means.
            // `updated_at` stays because this table is written by upsert, where the same
            // statement is the insert and the update.
            Omit<z.input<typeof DbCheckoutConfig>, keyof DbCheckoutCollection>
                & Partial<z.input<typeof DbCheckoutCollection>>,
            // Written in the storable form, not the read form: a codec encodes to what the
            // column takes, and a boolean column takes a boolean or the 0/1 SQLite hands back.
            Partial<z.input<typeof DbCheckoutConfig>>
        >;
    }
}
