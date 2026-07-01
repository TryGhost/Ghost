import {z} from 'zod';
import type {Knex} from 'knex';

// MySQL returns a Date, SQLite a string/number; normalise to Date on read.
// Lives here with the row schema that uses it until a second table needs it.
const DbDate = z.codec(z.union([z.date(), z.string(), z.number()]), z.date(), {
    decode: value => new Date(value),
    encode: date => date
});

// The gift_links table row: the single source for the read projection (queries.ts) and the knex
// types below.
export const DbGiftLink = z.object({
    token: z.string(),
    post_id: z.string(),
    created_at: DbDate,
    updated_at: DbDate.nullable()
});

// The post_gift_links association carries no domain object, so it stays a plain row type.
interface DbPostGiftLink {
    post_id: string;
    gift_link_token: string;
    created_at: Date;
    updated_at: Date | null;
}

// knex table types, derived from the schemas above so each row shape has a single source.
declare module 'knex/types/tables' {
    interface Tables {
        gift_links: Knex.CompositeTableType<
            z.infer<typeof DbGiftLink>,
            Omit<z.input<typeof DbGiftLink>, 'updated_at'>,
            Partial<z.infer<typeof DbGiftLink>>
        >;
        post_gift_links: Knex.CompositeTableType<
            DbPostGiftLink,
            Pick<DbPostGiftLink, 'post_id' | 'gift_link_token' | 'created_at'>,
            Partial<DbPostGiftLink>
        >;
    }
}
