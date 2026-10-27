import logging from '@tryghost/logging';
import { defineService } from '../../../kernel/define-service';
import { GiftLinksService } from './service';
import { recordGiftLinkAction, type RecordGiftLinkAction } from './actions';

export type { RequestContext } from './actions';

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export default defineService('Gift Links', () => {
  const { knex } = require('../../data/db');
  const models = require('../../models');

  const recordAction: RecordGiftLinkAction = ({ context, verb, subject }) =>
    recordGiftLinkAction({ Action: models.Action, logging, context, verb, subject });
  return new GiftLinksService({ knex, recordAction });
});
