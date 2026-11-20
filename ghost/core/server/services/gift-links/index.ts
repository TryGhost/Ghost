import { IncorrectUsageError } from '@tryghost/errors';
import { defineService } from '@tryghost/kernel/define-service';
import { alias } from '../../../shared/service-alias';
import { ActionLog } from '../../lib/action-log/action-log';
import { GiftLinksService } from './service';

// Nothing to start. Built the first time an endpoint reads it.
export default alias(
  defineService({
    name: 'Gift Links',
    create: ({ foundation }) => {
      if (!foundation.database) {
        throw new IncorrectUsageError({ message: 'Gift Links needs a database.' });
      }
      return new GiftLinksService({ knex: foundation.database.knex, actionLog: new ActionLog() });
    },
  }),
);
