import { defineService } from '../../../kernel/define-service';
import { ActionsService } from './actions-service';

// Needs nothing ready: an action is written through the transaction of the command it
// records, so the database is never reached from here. Boot initializes this root before the
// services whose changes it logs, as each reads its part of this service while it is created.
export default defineService('Actions', () => {
  return new ActionsService({ logging: require('@tryghost/logging') });
});
