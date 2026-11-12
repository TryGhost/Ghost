import { z } from 'zod';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { GiftLinkRow, giftLinkCodec, giftLinkColumns } from './codec';
import { generateGiftLinkToken, type GiftLink, type Post } from './models';
import type { ActionLog, ActionRow } from '../../lib/action-log/action-log';
import type { RequestContext } from '../../lib/actor';
import { ensureTransaction } from '../../lib/ensure-transaction';

// The LEFT JOIN leaves every link column nullable; the explicit generic names a row shape knex
// can't infer from a dynamic column list.
type LiveLinkRow = {
  [K in keyof z.input<typeof GiftLinkRow>]: z.input<typeof GiftLinkRow>[K] | null;
};

const PostTitle = z.object({ title: z.string() });

type GiftLinkAction = Pick<
  Extract<ActionRow, { resourceType: 'gift_link' }>,
  'event' | 'actionName'
>;

// Admin's History only shows an action name for 'edited' actions; 'added' and 'deleted' show
// the bare event. So a reset is an edit named "reset", while adding and revoking read as
// plain "added" and "deleted".
const ADDED: GiftLinkAction = { event: 'added' };
const RESET: GiftLinkAction = { event: 'edited', actionName: 'reset' };

export class GiftLinksService {
  private knex: Knex;
  private actionLog: ActionLog;

  constructor({ knex, actionLog }: { knex: Knex; actionLog: ActionLog }) {
    this.knex = knex;
    this.actionLog = actionLog;
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
      const { post: existing, title } = await this.lockedPost(trx, postId);
      if (existing.giftLinks.length) {
        return existing;
      }
      const post = await this.mint(trx, postId);
      await this.recordMint(trx, context, postId, title, ADDED);
      return post;
    });
  }

  /**
   * Replaces the post's live link with a new one. Given a transaction as `executor` it joins that
   * transaction; given a plain connection it opens its own.
   */
  async create(context: RequestContext, postId: string, executor: Knex = this.knex): Promise<Post> {
    return ensureTransaction(executor, async (trx) => {
      const { title } = await this.lockedPost(trx, postId);
      const post = await this.mint(trx, postId);
      await this.recordMint(trx, context, postId, title, RESET);
      return post;
    });
  }

  /**
   * Removes every post's live link. The `gift_links` rows are kept as history; only the live
   * association is removed. Given a transaction as `executor` it joins that transaction; given a
   * plain connection it opens its own.
   */
  async removeAll(context: RequestContext, executor: Knex = this.knex): Promise<number> {
    return ensureTransaction(executor, async (trx) => {
      const removed = await trx('post_gift_links').del();
      if (removed > 0) {
        await this.actionLog.record(trx, context, {
          resourceType: 'gift_link',
          event: 'deleted',
          resourceId: null,
        });
      }
      return removed;
    });
  }

  /**
   * The post with its live link, and its title, which actions on its links are named after. The
   * post's row is locked until `trx` ends, so two requests changing one post's link take turns.
   * A post that does not exist is refused as not found.
   *
   * The link is read with a lock too, after the post's. On MySQL a plain read sees the database
   * as it was at the transaction's first plain read, which in a caller's transaction can be
   * before the post was locked, so a plain read could miss a link that the request holding the
   * lock had just saved. A locking read sees what is committed now.
   */
  private async lockedPost(
    trx: Knex.Transaction,
    postId: string,
  ): Promise<{ post: Post; title: string }> {
    const row: unknown = await trx('posts').where('id', postId).forUpdate().first('title');
    const post = this.postFrom(postId, await this.postWithLiveLink(trx, postId).forUpdate());
    return { post, title: PostTitle.parse(row).title };
  }

  private recordMint(
    trx: Knex.Transaction,
    context: RequestContext,
    postId: string,
    title: string,
    action: GiftLinkAction,
  ) {
    return this.actionLog.record(trx, context, {
      resourceType: 'gift_link',
      ...action,
      resourceId: postId,
      primaryName: title,
    });
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
