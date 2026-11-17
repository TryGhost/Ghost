import type { Batch, Edited, OnUpdated } from '../../lib/changes';
import type { Post } from './models';

/**
 * A change a gift links command made, in the service's own terms. A link belongs to its post,
 * and gift links never adds or deletes a post, so every change is an edit of a post: the post as
 * the service knows it, before and after. The change's name says what happened to its link.
 */
export type GiftLinkChange =
  /** A post that had no live link was given one. */
  | Edited<'GiftLinkAdded', Post>
  /** A post's live link was replaced with a new one. */
  | Edited<'GiftLinkReset', Post>
  /** Every post's live link was removed at once. `changes` holds the edit to each post. */
  | Batch<'GiftLinksRemoved', Edited<'GiftLinkRemoved', Post>>;

/** The function the gift links service calls with each change it makes. */
export type OnGiftLinkUpdated = OnUpdated<GiftLinkChange>;
