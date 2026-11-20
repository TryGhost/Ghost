import { createNonTransactionalMigration } from '../../utils';
import logging from '@tryghost/logging';
import * as views from '../../../schema/views';

export default createNonTransactionalMigration(
  async function up(knex) {
    logging.info('Creating members_resolved_subscription view');
    await knex.schema.createViewOrReplace('members_resolved_subscription', function (view: any) {
      view.as(knex.raw(views.members_resolved_subscription));
    });
  },
  async function down(knex) {
    logging.info('Dropping members_resolved_subscription view');
    await knex.schema.dropViewIfExists('members_resolved_subscription');
  },
);
