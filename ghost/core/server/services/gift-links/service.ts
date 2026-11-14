import { z } from 'zod';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { GiftLinkRow, giftLinkCodec, giftLinkColumns } from './codec';
import { generateGiftLinkToken, type GiftLink, type Post } from './models';
import type { GiftLinkReactions } from './changes';
import type { RequestContext } from '../../lib/actor';
import { ensureTransaction } from '../../lib/ensure-transaction';

// The LEFT JOIN leaves every link column nullable; the explicit generic names a row shape knex
// can't infer from a dynamic column list.
type LiveLinkRow = {
  [K in keyof z.input<typeof GiftLinkRow>]: z.input<typeof GiftLinkRow>[K] | null;
};

export class GiftLinksService {
  private knex: Knex;
  private reactions: GiftLinkReactions;

  constructor({ knex, reactions }: { knex: Knex; reactions: GiftLinkReactions }) {
    this.knex = knex;
    this.reactions = reactions;
  }

  async getPost(postId: string, executor: Knex = this.knex): Promise<Post> {
    return this.postFrom(postId, await this.postWithLiveLink(executor, postId));
  }

  // Anchored on posts: zero rows means the post itself doesn't exist, not merely that it has
  // no live link.
  private postWithLiveLink(executor: Knex, postId: string) {
    return executor('posts')
      .where('posts.id', postId)
      .leftJoin('post_gift_links', 'post_gift_links.post_id', 'posts.id')
      .leftJoin('gift_links', 'gift_links.token', 'post_gift_links.gift_link_token')
      .select<LiveLinkRow[]>(giftLinkColumns);
  }

  private postFrom(postId: string, rows: LiveLinkRow[]): Post {
    if (rows.length === 0) {
      throw new errors.NotFoundError({ message: `Post ${postId} does not exist.` });
    }

    const giftLinks = rows
      .filter((row): row is z.input<typeof GiftLinkRow> => row.token !== null)
      .map((row) => z.decode(giftLinkCodec, row));
    return { id: postId, giftLinks };
  }

  async getPostByToken(token: string, executor: Knex = this.knex): Promise<Post | null> {
    const row = await executor('post_gift_links')
      .join('gift_links', 'gift_links.token', 'post_gift_links.gift_link_token')
      .where('gift_links.token', token)
      .first<z.input<typeof GiftLinkRow> & { post_id: string }>([
        ...giftLinkColumns,
        'post_gift_links.post_id as post_id',
      ]);
    return row ? { id: row.post_id, giftLinks: [z.decode(giftLinkCodec, row)] } : null;
  }

  /**
   * Returns the post with its live link, minting one if the post has none. Given a transaction as
   * `executor` it joins that transaction; given a plain connection it opens its own.
   */
  async ensure(context: RequestContext, postId: string, executor: Knex = this.knex): Promise<Post> {
    return ensureTransaction(executor, async (trx) => {
      const existing = await this.lockedPost(trx, postId);
      if (existing.giftLinks.length) {
        return existing;
      }
      const post = await this.mint(trx, postId);
      await this.reactions.onGiftLinkUpdated(trx, context, {
        type: 'GiftLinkAdded',
        change: 'added',
        next: post,
      });
      return post;
    });
  }

  /**
   * Replaces the post's live link with a new one. Given a transaction as `executor` it joins that
   * transaction; given a plain connection it opens its own.
   */
  async create(context: RequestContext, postId: string, executor: Knex = this.knex): Promise<Post> {
    return ensureTransaction(executor, async (trx) => {
      const previous = await this.lockedPost(trx, postId);
      const post = await this.mint(trx, postId);
      await this.reactions.onGiftLinkUpdated(trx, context, {
        type: 'GiftLinkReset',
        change: 'edited',
        previous,
        next: post,
      });
      return post;
    });
  }

  /**
   * Removes every post's live link, and returns each post as it was, with the link it lost. The
   * `gift_links` rows are kept as history; only the live association is removed. Given a
   * transaction as `executor` it joins that transaction; given a plain connection it opens its own.
   */
  async removeAll(context: RequestContext, executor: Knex = this.knex): Promise<Post[]> {
    return ensureTransaction(executor, async (trx) => {
      // Read with a lock, so the links returned are the ones the delete removes.
      const rows = await trx('post_gift_links')
        .join('gift_links', 'gift_links.token', 'post_gift_links.gift_link_token')
        .forUpdate()
        .select<Array<z.input<typeof GiftLinkRow> & { post_id: string }>>([
          ...giftLinkColumns,
          'post_gift_links.post_id as post_id',
        ]);
      const posts: Post[] = rows.map((row) => ({
        id: row.post_id,
        giftLinks: [z.decode(giftLinkCodec, row)],
      }));
      await trx('post_gift_links').del();
      if (posts.length > 0) {
        await this.reactions.onGiftLinkUpdated(trx, context, {
          type: 'GiftLinksRemoved',
          change: 'deleted',
          changes: posts.map((previous) => ({
            type: 'GiftLinkRemoved',
            change: 'deleted',
            previous,
          })),
        });
      }
      return posts;
    });
  }

  /**
   * The post with its live link, with the post's row locked until `trx` ends, so two requests
   * changing one post's link take turns. A post that does not exist is refused as not found.
   *
   * The link is read with a lock too, after the post's. On MySQL a plain read sees the database
   * as it was at the transaction's first plain read, which in a caller's transaction can be
   * before the post was locked, so a plain read could miss a link that the request holding the
   * lock had just saved. A locking read sees what is committed now.
   */
  private async lockedPost(trx: Knex.Transaction, postId: string): Promise<Post> {
    await trx('posts').where('id', postId).forUpdate().first('id');
    return this.postFrom(postId, await this.postWithLiveLink(trx, postId).forUpdate());
  }

  private async mint(trx: Knex.Transaction, postId: string): Promise<Post> {
    const link: GiftLink = { token: generateGiftLinkToken(), createdAt: new Date() };
    await this.addToHistory(trx, postId, link);
    await this.setLiveLink(trx, postId, link);
    return { id: postId, giftLinks: [link] };
  }

  private addToHistory(trx: Knex.Transaction, postId: string, link: GiftLink) {
    return trx('gift_links').insert({ ...z.encode(giftLinkCodec, link), post_id: postId });
  }

  private setLiveLink(trx: Knex.Transaction, postId: string, link: GiftLink) {
    return trx('post_gift_links')
      .insert({ post_id: postId, gift_link_token: link.token, created_at: link.createdAt })
      .onConflict('post_id')
      .merge({ gift_link_token: link.token, updated_at: link.createdAt });
  }
}
