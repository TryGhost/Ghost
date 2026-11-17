import { Batch, Edited, type OnUpdated } from '../../lib/changes';
import type { Post } from './models';

// A link belongs to its post, and gift links never adds or deletes a post, so every change is an
// edit of a post: the post as the service knows it, before and after. The change's name says
// what happened to its link.

/** A post that had no live link was given one. */
export class GiftLinkAdded extends Edited('GiftLinkAdded')<Post> {}

/** A post's live link was replaced with a new one. */
export class GiftLinkReset extends Edited('GiftLinkReset')<Post> {}

/** A post's live link was removed, as one of every post's. */
export class GiftLinkRemoved extends Edited('GiftLinkRemoved')<Post> {}

/** Every post's live link was removed at once. `changes` holds the edit to each post. */
export class GiftLinksRemoved extends Batch('GiftLinksRemoved')<GiftLinkRemoved> {}

/** A change a gift links command made, in the service's own terms. */
export type GiftLinkChange = GiftLinkAdded | GiftLinkReset | GiftLinksRemoved;

/** The function the gift links service calls with each change it makes. */
export type OnGiftLinkUpdated = OnUpdated<GiftLinkChange>;
