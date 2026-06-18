import errors from '@tryghost/errors';
import moment from 'moment';
import ObjectId from 'bson-objectid';
import type {Knex} from 'knex';
import {Post} from './post';
import type {GiftLinkToken} from './gift-link-token';

interface GiftLinkRow {
    id: string;
    post_id: string;
    token: string;
    redeemed_count: number;
    last_redeemed_at: Date | string | null;
    created_at: Date | string;
    updated_at: Date | string | null;
}

// SQLite returns datetimes as strings; parse them as UTC, since a bare `new Date(str)`
// reads them as local time. MySQL already returns a Date.
function toDate(value: Date | string): Date {
    return value instanceof Date ? value : moment.utc(value).toDate();
}

function rowToPost(row: GiftLinkRow): Post {
    return new Post(row.post_id, {
        token: row.token as GiftLinkToken,
        redeemedCount: row.redeemed_count,
        lastRedeemedAt: row.last_redeemed_at === null ? null : toDate(row.last_redeemed_at),
        createdAt: toDate(row.created_at)
    });
}

const CONSTRAINT_VIOLATION_CODES = new Set([
    'ER_DUP_ENTRY', 'ER_NO_REFERENCED_ROW_2', 'ER_NO_REFERENCED_ROW', // MySQL
    'SQLITE_CONSTRAINT', 'SQLITE_CONSTRAINT_UNIQUE', 'SQLITE_CONSTRAINT_FOREIGNKEY' // SQLite
]);
function isConstraintViolation(err: unknown): boolean {
    return CONSTRAINT_VIOLATION_CODES.has((err as {code?: string}).code ?? '');
}

/**
 * Two tables back the domain: `gift_links` is the append-only history (durable read
 * counts) and `gift_links_active` is the one live link per post. Liveness is structural —
 * a row in `gift_links_active`, whose UNIQUE(post_id) enforces "<=1 live link per post" —
 * so archiving deletes the active row and keeps the history row.
 */
export class GiftLinkKnexRepository {
    private knex: Knex;

    constructor({knex}: {knex: Knex}) {
        this.knex = knex;
    }

    // A post with no live link is the empty aggregate, not an error; the post's own
    // existence is checked on write by the FK, not here.
    async getByPostId(postId: string): Promise<Post> {
        const row = await this.liveQuery().where('a.post_id', postId).first<GiftLinkRow | undefined>();
        return row ? rowToPost(row) : new Post(postId, null);
    }

    async getByToken(token: string): Promise<Post | null> {
        const row = await this.liveQuery().where('gl.token', token).first<GiftLinkRow | undefined>();
        return row ? rowToPost(row) : null;
    }

    // Insert-only, so a concurrent issue hits UNIQUE(post_id) and converges on the existing
    // link rather than replacing a token already handed back.
    async create(post: Post): Promise<Post> {
        try {
            await this.knex.transaction(trx => this.insertLink(trx, post));
            return post;
        } catch (err) {
            return this.convergeOnConflict(post, err);
        }
    }

    // Rotate: archive the live link and mint a new one in one transaction.
    async replace(post: Post): Promise<Post> {
        try {
            await this.knex.transaction(async (trx) => {
                await trx('gift_links_active').where({post_id: post.id}).del();
                await this.insertLink(trx, post);
            });
            return post;
        } catch (err) {
            return this.convergeOnConflict(post, err);
        }
    }

    async revokeAllActive(): Promise<number> {
        return this.knex('gift_links_active').del();
    }

    // Keyed by token, not liveness, so a read against a since-reissued token still counts.
    async recordRedemption(token: string): Promise<number> {
        const now = new Date();
        return this.knex('gift_links')
            .where({token})
            .update({last_redeemed_at: now, updated_at: now})
            .increment('redeemed_count', 1);
    }

    private liveQuery(): Knex.QueryBuilder {
        return this.knex('gift_links_active as a')
            .join('gift_links as gl', 'gl.id', 'a.gift_link_id')
            .select('gl.*');
    }

    private async insertLink(trx: Knex.Transaction, post: Post): Promise<void> {
        if (!post.giftLink) {
            return;
        }
        const giftLinkId = ObjectId().toHexString();
        await trx('gift_links').insert({
            id: giftLinkId,
            post_id: post.id,
            token: post.giftLink.token,
            redeemed_count: post.giftLink.redeemedCount,
            last_redeemed_at: post.giftLink.lastRedeemedAt,
            created_at: post.giftLink.createdAt,
            updated_at: post.giftLink.createdAt
        });
        await trx('gift_links_active').insert({
            id: ObjectId().toHexString(),
            gift_link_id: giftLinkId,
            post_id: post.id,
            created_at: new Date()
        });
    }

    // A constraint violation on write is either losing the race for the post's active slot
    // (return the winner) or a missing post (NotFound); anything else is unexpected.
    private async convergeOnConflict(post: Post, err: unknown): Promise<Post> {
        if (!isConstraintViolation(err)) {
            throw err;
        }
        const current = await this.getByPostId(post.id);
        if (current.giftLink) {
            return current;
        }
        if (!(await this.postExists(post.id))) {
            throw new errors.NotFoundError({message: `Cannot create a gift link: post ${post.id} does not exist.`});
        }
        throw err;
    }

    private async postExists(postId: string): Promise<boolean> {
        return Boolean(await this.knex('posts').where({id: postId}).first('id'));
    }
}
