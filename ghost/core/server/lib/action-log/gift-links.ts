import type { GiftLinkChange, OnGiftLinkUpdated } from '../../services/gift-links/changes';
import type { ActionLog, ActionRow } from './action-log';

type GiftLinkAction = Extract<ActionRow, { resourceType: 'gift_link' }>;

/**
 * Logs the changes the gift links service reports. This is the only place that knows how a gift
 * link change reads in Admin's History; the service only says what happened.
 */
export function recordGiftLinkChanges(actionLog: ActionLog): OnGiftLinkUpdated {
  return async (trx, context, change) => {
    await actionLog.record(trx, context, actionFor(change));
  };
}

// A link has no id of its own, so an action is about the link's post and is named after it.
// History only shows an action's name for an edit, so a reset is an edit named "reset", while a
// first link and a removal read as a plain "added" and "deleted".
function actionFor(change: GiftLinkChange): GiftLinkAction {
  switch (change.type) {
    case 'GiftLinkAdded':
      return {
        resourceType: 'gift_link',
        event: 'added',
        resourceId: change.next.id,
        primaryName: change.next.title,
      };
    case 'GiftLinkReset':
      return {
        resourceType: 'gift_link',
        event: 'edited',
        actionName: 'reset',
        resourceId: change.next.id,
        primaryName: change.next.title,
      };
    // Removing every link at once belongs to no single post.
    case 'GiftLinksRemoved':
      return { resourceType: 'gift_link', event: 'deleted', resourceId: null };
  }
}
