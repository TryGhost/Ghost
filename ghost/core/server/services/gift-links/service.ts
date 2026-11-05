import { z } from 'zod';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { GiftLinkRow, giftLinkCodec, giftLinkColumns } from './codec';
import { generateGiftLinkToken, type GiftLink, type Post } from './models';
import type { ActionChange, KindLog } from '../../lib/action-log/action-log';
import type { RequestContext } from '../../lib/actor';
import type { giftLinkActions } from './action-kind';

// The LEFT JOIN leaves every link column nullable; the explicit generic names a row shape knex
// can't infer from a dynamic column list.
type LiveLinkRow = {
  [K in keyof z.input<typeof GiftLinkRow>]: z.input<typeof GiftLinkRow>[K] | null;
};

type PostLinkRow = LiveLinkRow & { post_title: unknown };

const PostTitle = z.object({ post_title: z.string() });

export class GiftLinksService {
  private knex: Knex;
  private actionLog: KindLog<typeof giftLinkActions>;

  constructor({ knex, actionLog }: { knex: Knex; actionLog: KindLog<typeof giftLinkActions> }) {
    this.knex = knex;
    this.actionLog = actionLog;
  }

  async getPost(postId: string): Promise<Post> {
    return (await this.readPost(postId)).post;
  }

  async getPostByToken(token: string): Promise<Post | null> {
    const row = await this.knex('post_gift_links')
      .join('gift_links', 'gift_links.token', 'post_gift_links.gift_link_token')
      .where('gift_links.token', token)
      .first<z.input<typeof GiftLinkRow> & { post_id: string }>([
        ...giftLinkColumns,
        'post_gift_links.post_id as post_id',
      ]);
    return row ? { id: row.post_id, giftLinks: [z.decode(giftLinkCodec, row)] } : null;
  }

  async ensure(context: RequestContext, postId: string): Promise<Post> {
    const { post, title } = await this.readPost(postId);
    if (post.giftLinks.length) {
      return post;
    }
    return this.mint(context, post.id, title, { event: 'added' });
  }

  async create(context: RequestContext, postId: string): Promise<Post> {
    const { post, title } = await this.readPost(postId);
    return this.mint(context, post.id, title, { actionName: 'reset' });
  }

  // gift_links rows are kept as history; only the live association is removed.
  async removeAll(context: RequestContext): Promise<number> {
    const removed = await this.knex('post_gift_links').del();
    if (removed > 0) {
      await this.actionLog.record(this.knex, context, {
        event: 'deleted',
        resourceId: null,
        count: removed,
      });
    }
    return removed;
  }

  private async mint(
    context: RequestContext,
    postId: string,
    title: string,
    change: ActionChange<typeof giftLinkActions>,
  ): Promise<Post> {
    const link: GiftLink = { token: generateGiftLinkToken(), createdAt: new Date() };
    await this.knex.transaction(async (trx) => {
      await this.addToHistory(trx, postId, link);
      await this.setLiveLink(trx, postId, link);
      await this.actionLog.record(trx, context, {
        ...change,
        resourceId: postId,
        primaryName: title,
      });
    });
    return { id: postId, giftLinks: [link] };
  }

  /** A post with its live links, and its title, which actions on its links are named after. */
  private async readPost(postId: string): Promise<{ post: Post; title: string }> {
    // Anchored on posts: zero rows means the post itself doesn't exist, not merely that it has
    // no live link.
    const rows = await this.knex('posts')
      .where('posts.id', postId)
      .leftJoin('post_gift_links', 'post_gift_links.post_id', 'posts.id')
      .leftJoin('gift_links', 'gift_links.token', 'post_gift_links.gift_link_token')
      .select<PostLinkRow[]>([...giftLinkColumns, 'posts.title as post_title']);

    if (rows.length === 0) {
      throw new errors.NotFoundError({ message: `Post ${postId} does not exist.` });
    }

    const giftLinks = rows
      .filter((row): row is PostLinkRow & z.input<typeof GiftLinkRow> => row.token !== null)
      .map((row) => z.decode(giftLinkCodec, row));
    return { post: { id: postId, giftLinks }, title: PostTitle.parse(rows[0]).post_title };
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
