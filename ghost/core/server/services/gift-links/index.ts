import { defineService } from '../../../kernel/define-service';
import { GiftLinksService } from './service';

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
// Boot initializes the actions service first, as this root reads it while it is created.
export default defineService('Gift Links', () => {
  const { knex } = require('../../data/db');

  const actions: typeof import('../actions').default = require('../actions').default;

  // Each change is logged as a staff action, inside the command that made it.
  return new GiftLinksService({ knex, reactions: actions.service.giftLinks });
});
