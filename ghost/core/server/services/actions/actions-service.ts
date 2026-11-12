import type { GhostLogger } from '@tryghost/logging';
import type { GiftLinkReactions } from '../gift-links/changes';
import { ActionLog } from './action-log';
import { giftLinkActions } from './gift-links';

interface ActionsServiceDeps {
  logging: GhostLogger;
}

/**
 * Staff actions: the record of what a staff user or integration did, stored in the `actions`
 * table and read by Admin's History page through the actions API.
 *
 * A service that reports its changes is given the member of this service named after it, as the
 * function it calls with each change. That function writes the action inside the command's
 * transaction. No other service builds an action or knows how one is stored.
 *
 * Bookshelf models log their own actions and do not go through this service.
 */
export class ActionsService {
  readonly logging: GhostLogger;
  /** Logs the changes the gift links service makes. */
  readonly giftLinks: GiftLinkReactions;

  constructor({ logging }: ActionsServiceDeps) {
    this.logging = logging;
    const actionLog = new ActionLog({ logging });
    this.giftLinks = giftLinkActions(actionLog);
  }
}
