import { giftLinkEvents, type GiftLinkEvent } from '../gift-links/events';
import type { Post } from '../gift-links/models';
import { createActionLog } from './action-log';

/**
 * Gift link actions are about a post's gift link rather than the post, so they follow the
 * link: it is added, reset, and deleted when every link is revoked.
 */
export const giftLinkActionLog = createActionLog<Post, GiftLinkEvent>({
  events: giftLinkEvents,
  idOf: (post) => post.id,
  describe: (event) => {
    switch (event.type) {
      case 'GiftLinkAdded':
        return { name: event.next.title, verb: 'added' };
      case 'GiftLinkReset':
        return { name: event.next.title, actionName: 'reset' };
      case 'GiftLinksRevoked':
        return { name: 'All gift links', verb: 'deleted' };
    }
  },
});
