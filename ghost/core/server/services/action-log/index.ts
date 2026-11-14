import { defineService } from '../../../kernel/define-service';
import { ActionLogService } from './service';

// Needs the database connected and the models loaded. Boot initializes this root before the services that write actions,
// as each reads it while it is created.
export default defineService('Action Log', () => {
  const { knex } = require('../../data/db');
  const models = require('../../models');

  return new ActionLogService({ knex, Action: models.Action });
});
