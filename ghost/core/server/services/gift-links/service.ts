import { z } from 'zod';
import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import { GiftLinkRow, giftLinkCodec, giftLinkColumns } from './codec';
import { generateGiftLinkToken, type GiftLink, type Post } from './models';
import type { RequestContext } from '../../lib/actor';
import {
  GiftLinkAdded,
  GiftLinkRemoved,
  GiftLinkReset,
  GiftLinksRemoved,
  type OnGiftLinkUpdated,
} from './changes';
import { ensureTransaction } from '../../lib/ensure-transaction';

// The LEFT JOIN leaves every link column nullable; the explicit generic names a row shape knex
// can't infer from a dynamic column list.
type LiveLinkRow = {
  [K in keyof z.input<typeof GiftLinkRow>]: z.input<typeof GiftLinkRow>[K] | null;
} & { post_title: unknown };

// A live link read from the link's side, so every link column is present.
type LinkedPostRow = z.input<typeof GiftLinkRow> & { post_id: string; post_title: unknown };
const linkedPostColumns = [
  ...giftLinkColumns,
  'post_gift_links.post_id as post_id',
  'posts.title as post_title',
];

// A knex generic only asserts a column's type, so a title is checked as it is read. A link
// whose post's title could not be read fails the command, where an unchecked value would be
// reported and stored.
const PostTitle = z.string();

const linkedPost = (row: LinkedPostRow): Post => ({
  id: row.post_id,
  title: PostTitle.parse(row.post_title),
  giftLinks: [z.decode(giftLinkCodec, row)],
});

export class GiftLinksService {
  private knex: Knex;
  private onGiftLinkUpdated: OnGiftLinkUpdated;

  constructor({
    knex,
    onGiftLinkUpdated,
  }: {
    knex: Knex;
    /** Called with each change a command makes, inside the command's transaction. */
    onGiftLinkUpdated: OnGiftLinkUpdated;
  }) {
    this.knex = knex;
    this.onGiftLinkUpdated = onGiftLinkUpdated;
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
      .select<LiveLinkRow[]>([...giftLinkColumns, 'posts.title as post_title']);
  }

  private postFrom(postId: string, rows: LiveLinkRow[]): Post {
    if (rows.length === 0) {
      throw new errors.NotFoundError({ message: `Post ${postId} does not exist.` });
    }

    const giftLinks = rows
      .filter((row): row is LiveLinkRow & z.input<typeof GiftLinkRow> => row.token !== null)
      .map((row) => z.decode(giftLinkCodec, row));
    return { id: postId, title: PostTitle.parse(rows[0].post_title), giftLinks };
  }

  async getPostByToken(token: string, executor: Knex = this.knex): Promise<Post | null> {
    const row = await executor('post_gift_links')
      .join('gift_links', 'gift_links.token', 'post_gift_links.gift_link_token')
      .join('posts', 'posts.id', 'post_gift_links.post_id')
      .where('gift_links.token', token)
      .first<LinkedPostRow>(linkedPostColumns);
    return row ? linkedPost(row) : null;
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
      const post = await this.mint(trx, existing);
      await this.onGiftLinkUpdated(trx, context, new GiftLinkAdded(existing, post));
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
      const post = await this.mint(trx, previous);
      await this.onGiftLinkUpdated(
        trx,
        context,
        // A post with no live link to replace is given its first one.
        previous.giftLinks.length
          ? new GiftLinkReset(previous, post)
          : new GiftLinkAdded(previous, post),
      );
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
      // The links are read with a lock, so the ones reported are the ones the delete removes.
      // Their posts are not locked: adding or resetting a link locks the post and then its link,
      // so locking a post here, after its link, could deadlock with either.
      const links = await trx('post_gift_links')
        .join('gift_links', 'gift_links.token', 'post_gift_links.gift_link_token')
        .forUpdate()
        .select<Array<z.input<typeof GiftLinkRow> & { post_id: string }>>([
          ...giftLinkColumns,
          'post_gift_links.post_id as post_id',
        ]);
      const titles = new Map(
        z
          .array(z.object({ id: z.string(), title: PostTitle }))
          .parse(
            await trx('posts')
              .whereIn(
                'id',
                links.map((link) => link.post_id),
              )
              .select('id', 'title'),
          )
          .map((post) => [post.id, post.title]),
      );
      const rows = links.map((link) => ({ ...link, post_title: titles.get(link.post_id) }));
      const removed = await trx('post_gift_links').del();
      if (rows.length > 0) {
        await this.onGiftLinkUpdated(
          trx,
          context,
          new GiftLinksRemoved(
            rows
              .map(linkedPost)
              .map((previous) => new GiftLinkRemoved(previous, { ...previous, giftLinks: [] })),
          ),
        );
      }
      return removed;
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

  /** Gives the post a new live link, and returns the post as it is with that link. */
  private async mint(trx: Knex.Transaction, post: Post): Promise<Post> {
    const link: GiftLink = { token: generateGiftLinkToken(), createdAt: new Date() };
    await this.addToHistory(trx, post.id, link);
    await this.setLiveLink(trx, post.id, link);
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
