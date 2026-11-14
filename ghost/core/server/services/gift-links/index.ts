import logging from '@tryghost/logging';
import { defineService } from '../../../kernel/define-service';
import { GiftLinksService } from './service';
import { recordGiftLinkAction, type RecordGiftLinkAction } from './actions';

export type { RequestContext } from './actions';

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export default defineService('Gift Links', () => {
  const { knex } = require('../../data/db');
  // Boot initializes the action log before this service, which writes its actions through it.
  const actionLog: typeof import('../action-log').default = require('../action-log').default;

  const recordAction: RecordGiftLinkAction = (transacting, { context, verb, subject }) =>
    recordGiftLinkAction({
      actionLog: actionLog.service,
      logging,
      transacting,
      context,
      verb,
      subject,
    });
  return new GiftLinksService({ knex, recordAction });
});
