import { z } from 'zod';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { GiftLinkRow, giftLinkCodec, giftLinkColumns } from './codec';
import { generateGiftLinkToken, type GiftLink, type Post } from './models';
import type { GiftLinkEvent } from './events';
import type { RequestContext } from '../../lib/actor';
import type { ChangeEvents } from '../../lib/change-events';

// The LEFT JOIN leaves every link column nullable; the explicit generic names a row shape knex
// can't infer from a dynamic column list.
type LiveLinkRow = {
  [K in keyof z.input<typeof GiftLinkRow>]: z.input<typeof GiftLinkRow>[K] | null;
} & { title: string };

export class GiftLinksService {
  private knex: Knex;
  private events: ChangeEvents<GiftLinkEvent>;

  constructor({ knex, events }: { knex: Knex; events: ChangeEvents<GiftLinkEvent> }) {
    this.knex = knex;
    this.events = events;
  }

  async getPost(postId: string): Promise<Post> {
    // Anchored on posts: zero rows means the post itself doesn't exist, not merely that it has
    // no live link.
    const rows = await this.knex('posts')
      .where('posts.id', postId)
      .leftJoin('post_gift_links', 'post_gift_links.post_id', 'posts.id')
      .leftJoin('gift_links', 'gift_links.token', 'post_gift_links.gift_link_token')
      .select<LiveLinkRow[]>([...giftLinkColumns, 'posts.title as title']);

    if (rows.length === 0) {
      throw new errors.NotFoundError({ message: `Post ${postId} does not exist.` });
    }

    const giftLinks = rows
      .filter((row): row is z.input<typeof GiftLinkRow> & { title: string } => row.token !== null)
      .map((row) => z.decode(giftLinkCodec, row));
    return { id: postId, title: rows[0].title, giftLinks };
  }

  /**
   * The post a live token belongs to, without the post's own columns: this runs on every
   * read that carries a gift token.
   */
  async getPostByToken(token: string): Promise<Pick<Post, 'id' | 'giftLinks'> | null> {
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
    const post = await this.getPost(postId);
    if (post.giftLinks.length) {
      return post;
    }
    const minted = await this.mint(post);
    await this.events.raise(context.actor, {
      type: 'GiftLinkAdded',
      change: 'edited',
      previous: post,
      next: minted,
    });
    return minted;
  }

  async create(context: RequestContext, postId: string): Promise<Post> {
    const post = await this.getPost(postId);
    const minted = await this.mint(post);
    await this.events.raise(context.actor, {
      type: 'GiftLinkReset',
      change: 'edited',
      previous: post,
      next: minted,
    });
    return minted;
  }

  // gift_links rows are kept as history; only the live association is removed.
  async removeAll(context: RequestContext): Promise<number> {
    const removed = await this.knex('post_gift_links').del();
    if (removed > 0) {
      await this.events.raise(context.actor, {
        type: 'GiftLinksRevoked',
        change: 'edited',
        count: removed,
      });
    }
    return removed;
  }

  private async mint(post: Post): Promise<Post> {
    const link: GiftLink = { token: generateGiftLinkToken(), createdAt: new Date() };
    await this.knex.transaction(async (trx) => {
      await this.addToHistory(trx, post.id, link);
      await this.setLiveLink(trx, post.id, link);
    });
    return { ...post, giftLinks: [link] };
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
