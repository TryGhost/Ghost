import type { Knex } from 'knex';
import type { RequestContext } from '../../lib/actor';
import type { Added, Batch, Deleted, Edited } from '../../lib/changes';
import type { Post } from './models';

/**
 * A change a gift links command made, in the service's own terms. A link belongs to its post,
 * so each change is to a post and its live link.
 */
export type GiftLinkChange =
  /** A post that had no live link was given one. */
  | Added<'GiftLinkAdded', Post>
  /** A post's live link was replaced with a new one. */
  | Edited<'GiftLinkReset', Post>
  /** Every post's live link was removed at once. */
  | Batch<'GiftLinksRemoved', Deleted<'GiftLinkRemoved', Post>>;

/**
 * What the gift links service tells about each change it makes. The service's root supplies it,
 * and the service knows nothing about who is told or what they do with a change.
 *
 * `onGiftLinkUpdated` is called inside the command's transaction, after the change is written.
 * What it writes through `trx` is saved with the change, and if it throws, the command fails and
 * the change is rolled back.
 */
export interface GiftLinkReactions {
  onGiftLinkUpdated(
    trx: Knex.Transaction,
    context: RequestContext,
    change: GiftLinkChange,
  ): Promise<void>;
}
