import { defineService } from '../../../kernel/define-service';
import { ActionLog } from '../../lib/action-log/action-log';
import { giftLinkActions } from './actions';
import { GiftLinksService } from './service';

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export default defineService('Gift Links', () => {
  const { knex } = require('../../data/db');
  return new GiftLinksService({ knex, actionLog: new ActionLog().for(giftLinkActions) });
});
