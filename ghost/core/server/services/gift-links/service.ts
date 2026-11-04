import { z } from 'zod';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { GiftLinkRow, giftLinkCodec, giftLinkColumns } from './codec';
import { generateGiftLinkToken, type GiftLink, type Post } from './models';
import type { ActionLog, ActionRow } from '../../lib/action-log/action-log';
import type { RequestContext } from '../../lib/actor';

// The LEFT JOIN leaves every link column nullable; the explicit generic names a row shape knex
// can't infer from a dynamic column list.
type LiveLinkRow = {
  [K in keyof z.input<typeof GiftLinkRow>]: z.input<typeof GiftLinkRow>[K] | null;
};

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

  async getPost(postId: string): Promise<Post> {
    // Anchored on posts: zero rows means the post itself doesn't exist, not merely that it has
    // no live link.
    const rows = await this.knex('posts')
      .where('posts.id', postId)
      .leftJoin('post_gift_links', 'post_gift_links.post_id', 'posts.id')
      .leftJoin('gift_links', 'gift_links.token', 'post_gift_links.gift_link_token')
      .select<LiveLinkRow[]>(giftLinkColumns);

    if (rows.length === 0) {
      throw new errors.NotFoundError({ message: `Post ${postId} does not exist.` });
    }

    const giftLinks = rows
      .filter((row): row is z.input<typeof GiftLinkRow> => row.token !== null)
      .map((row) => z.decode(giftLinkCodec, row));
    return { id: postId, giftLinks };
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
    const post = await this.getPost(postId);
    if (post.giftLinks.length) {
      return post;
    }
    return this.mint(context, postId, ADDED);
  }

  async create(context: RequestContext, postId: string): Promise<Post> {
    await this.getPost(postId); // asserts the post exists (throws NotFound)
    return this.mint(context, postId, RESET);
  }

  // gift_links rows are kept as history; only the live association is removed.
  async removeAll(context: RequestContext): Promise<number> {
    const removed = await this.knex('post_gift_links').del();
    if (removed > 0) {
      await this.actionLog.record(context.actor, {
        resourceType: 'gift_link',
        event: 'deleted',
        resourceId: null,
      });
    }
    return removed;
  }

  private async mint(
    context: RequestContext,
    postId: string,
    action: GiftLinkAction,
  ): Promise<Post> {
    const link: GiftLink = { token: generateGiftLinkToken(), createdAt: new Date() };
    await this.knex.transaction(async (trx) => {
      await this.addToHistory(trx, postId, link);
      await this.setLiveLink(trx, postId, link);
      await this.actionLog.record(
        context.actor,
        {
          resourceType: 'gift_link',
          ...action,
          resourceId: postId,
          primaryName: await this.titleOf(trx, postId),
        },
        { transacting: trx },
      );
    });
    return { id: postId, giftLinks: [link] };
  }

  private async titleOf(trx: Knex.Transaction, postId: string): Promise<string> {
    const post = await trx('posts')
      .where('id', postId)
      .first<{ title: string } | undefined>('title');
    if (!post) {
      throw new errors.NotFoundError({ message: `Post ${postId} does not exist.` });
    }
    return post.title;
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
