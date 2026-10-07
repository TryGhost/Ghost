import { createChangeEvents, type Batch, type Edited } from '../../lib/change-events';
import type { Post } from './models';

/**
 * What happens to a post's gift links. The post exists before and after each change, so
 * every change is an edit of the post.
 */
export type GiftLinkEvent =
  | Edited<'GiftLinkAdded', Post>
  | Edited<'GiftLinkReset', Post>
  | Batch<'GiftLinksRevoked', 'edited'>;

/** The events the gift-links service raises once each change is saved. */
export const giftLinkEvents = createChangeEvents<GiftLinkEvent>();
