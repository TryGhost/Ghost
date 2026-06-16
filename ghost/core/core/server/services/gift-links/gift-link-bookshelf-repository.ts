import type {GiftLink, GiftLinkStatus} from './gift-link';
import type {GiftLinkRepository, RepositoryOptions} from './gift-link-repository';

interface GiftLinkModelInstance {
    toJSON(): Record<string, unknown>;
}

interface GiftLinkBookshelfModel {
    add(data: Record<string, unknown>, options?: RepositoryOptions): Promise<GiftLinkModelInstance>;
    transaction<T>(callback: (transacting: unknown) => Promise<T>): Promise<T>;
}

// knex is untyped in the wider codebase; describe only what we use. The query
// builder is thenable, hence the pragmatic `any` (matches Ghost's model layer).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KnexQuery = any;
type Knex = ((table: string) => KnexQuery) & {
    raw(sql: string): unknown;
    select(...columns: string[]): KnexQuery;
};

/**
 * Bookshelf/knex-backed {@link GiftLinkRepository}. Reads, sweeps and counter
 * updates go straight to knex; only `create` uses the model layer, because the
 * `id` (ObjectId) and `created_at` are assigned by Ghost's base model on insert.
 */
export class GiftLinkBookshelfRepository implements GiftLinkRepository {
    private model: GiftLinkBookshelfModel;
    private knex: Knex;

    constructor({GiftLinkModel, knex}: {GiftLinkModel: GiftLinkBookshelfModel; knex: Knex}) {
        this.model = GiftLinkModel;
        this.knex = knex;
    }

    private applyTransacting(query: KnexQuery, options: RepositoryOptions): KnexQuery {
        if (options.transacting) {
            query.transacting(options.transacting);
        }
        return query;
    }

    private toGiftLink(row: Record<string, unknown>): GiftLink {
        return {
            id: row.id as string,
            post_id: row.post_id as string,
            token: row.token as string,
            status: row.status as GiftLinkStatus,
            redeemed_count: Number(row.redeemed_count),
            last_redeemed_at: (row.last_redeemed_at as Date | null) ?? null,
            created_at: row.created_at as Date,
            updated_at: (row.updated_at as Date | null) ?? null
        };
    }

    async getActiveByPostId(postId: string, options: RepositoryOptions = {}): Promise<GiftLink | null> {
        const query = this.knex('gift_links')
            .where({post_id: postId, status: 'active'})
            .orderBy('created_at', 'desc')
            .orderBy('id', 'desc')
            .first();
        const row = await this.applyTransacting(query, options);
        return row ? this.toGiftLink(row) : null;
    }

    async getActiveByToken(token: string, options: RepositoryOptions = {}): Promise<GiftLink | null> {
        if (!token) {
            return null;
        }
        const query = this.knex('gift_links')
            .where({token, status: 'active'})
            .first();
        const row = await this.applyTransacting(query, options);
        return row ? this.toGiftLink(row) : null;
    }

    async postExists(postId: string, options: RepositoryOptions = {}): Promise<boolean> {
        const query = this.knex('posts').where({id: postId}).first('id');
        const row = await this.applyTransacting(query, options);
        return Boolean(row);
    }

    async create(postId: string, token: string, options: RepositoryOptions = {}): Promise<GiftLink> {
        const model = await this.model.add({post_id: postId, token}, options);
        return this.toGiftLink(model.toJSON());
    }

    async deactivateActiveByPostId(postId: string, options: RepositoryOptions = {}): Promise<number> {
        const query = this.knex('gift_links')
            .where({post_id: postId, status: 'active'})
            .update({status: 'inactive', updated_at: new Date()});
        return this.applyTransacting(query, options);
    }

    async deactivateAllButMostRecent(postId: string, options: RepositoryOptions = {}): Promise<void> {
        // Choose the keep-row and deactivate the rest in ONE statement. A
        // separate SELECT-then-UPDATE leaves a window where a concurrent reset
        // could deactivate the chosen keep-row and insert a newer active row
        // that the UPDATE would then also deactivate, leaving ZERO active links.
        // The keep-row is wrapped in a derived table because MySQL forbids
        // referencing the UPDATE's target table directly in a subquery (ER 1093);
        // the extra nesting is a harmless no-op on SQLite.
        const mostRecent = this.knex('gift_links')
            .where({post_id: postId, status: 'active'})
            .orderBy('created_at', 'desc')
            .orderBy('id', 'desc')
            .limit(1)
            .select('id')
            .as('t');
        const query = this.knex('gift_links')
            .where({post_id: postId, status: 'active'})
            .whereNotIn('id', this.knex.select('id').from(mostRecent))
            .update({status: 'inactive', updated_at: new Date()});
        await this.applyTransacting(query, options);
    }

    async deactivateAllActive(options: RepositoryOptions = {}): Promise<number> {
        const query = this.knex('gift_links')
            .where({status: 'active'})
            .update({status: 'inactive', updated_at: new Date()});
        return this.applyTransacting(query, options);
    }

    async recordRead(giftLinkId: string): Promise<number> {
        const now = new Date();
        // Filtered by id only (not status): a read that was served against a link
        // which a concurrent reset then deactivated still belongs to that link.
        return this.knex('gift_links')
            .where({id: giftLinkId})
            .update({
                redeemed_count: this.knex.raw('redeemed_count + 1'),
                last_redeemed_at: now,
                updated_at: now
            });
    }

    async transaction<T>(callback: (transacting: unknown) => Promise<T>): Promise<T> {
        return this.model.transaction(callback);
    }
}
