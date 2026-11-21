import { defineService } from '../../../kernel/define-service';
import { ActionLog } from '../../lib/action-log/action-log';
import { recordGiftLinkChanges } from '../../lib/action-log/gift-links';
import { GiftLinksService } from './service';

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export default defineService('Gift Links', () => {
  const { knex } = require('../../data/db');
  // Each change is logged as a staff action, inside the command that made it.
  return new GiftLinksService({ knex, onGiftLinkUpdated: recordGiftLinkChanges(new ActionLog()) });
});
