import logging from '@tryghost/logging';
import { defineService } from '../../../kernel/define-service';
import { createChangeEvents } from '../../lib/change-events';
import type { GiftLinkEvent } from './events';
import { GiftLinksService } from './service';

export type { RequestContext } from '../../lib/actor';

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export default defineService('Gift Links', () => {
  const { knex } = require('../../data/db');

  return new GiftLinksService({
    knex,
    events: createChangeEvents<GiftLinkEvent>({ logging }),
  });
});
