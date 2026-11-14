import type { GiftLinkChange, GiftLinkReactions } from '../gift-links/changes';
import type { Action, ActionLog } from './action-log';

/**
 * Logs gift link changes as staff actions. This is the only place that knows how a gift link
 * change reads in Admin's History; the gift links service only says what happened.
 */
export function giftLinkActions(actionLog: ActionLog): GiftLinkReactions {
  return {
    async onGiftLinkUpdated(trx, context, change) {
      await actionLog.write(trx, context, actionFor(change));
    },
  };
}

// A link has no id of its own, so an action is about the link's post. History only shows an
// action's name for an edit, so a reset is stored as an edit named "reset", while a first link
// and a removal read as a plain "added" and "deleted".
function actionFor(change: GiftLinkChange): Action {
  switch (change.type) {
    case 'GiftLinkAdded':
      return { resourceType: 'gift_link', event: 'added', resourceId: change.next.id };
    case 'GiftLinkReset':
      return {
        resourceType: 'gift_link',
        event: 'edited',
        resourceId: change.next.id,
        context: { action_name: 'reset' },
      };
    // Removing every link at once belongs to no single post.
    case 'GiftLinksRemoved':
      return { resourceType: 'gift_link', event: 'deleted', resourceId: null };
  }
}
