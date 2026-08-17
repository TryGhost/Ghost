import {z} from 'zod';
import type {Knex} from 'knex';
import {DbDate} from '../../lib/db-date';

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
