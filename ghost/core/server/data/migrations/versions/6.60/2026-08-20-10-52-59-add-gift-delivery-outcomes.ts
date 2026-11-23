import {
  combineNonTransactionalMigrations,
  createAddColumnMigration,
  createNonTransactionalMigration,
} from '../../utils';
import { addIndex, dropIndex } from '../../../schema/commands';

const addProviderMessageIdIndex = createNonTransactionalMigration(
  async function up(knex) {
    await addIndex('gift_deliveries', ['email_provider_message_id'], knex, { length: 31 });
  },
  async function down(knex) {
    await dropIndex('gift_deliveries', ['email_provider_message_id'], knex);
  },
);

export default combineNonTransactionalMigrations(
  createAddColumnMigration('gift_deliveries', 'outcome', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'unknown',
    validations: {
      isIn: [['unknown', 'delivered', 'temporary_failed', 'permanent_failed']],
    },
  }),
  createAddColumnMigration('gift_deliveries', 'outcome_at', {
    type: 'dateTime',
    nullable: true,
  }),
  createAddColumnMigration('gift_deliveries', 'outcome_error', {
    type: 'text',
    maxlength: 65535,
    nullable: true,
  }),
  addProviderMessageIdIndex,
);
