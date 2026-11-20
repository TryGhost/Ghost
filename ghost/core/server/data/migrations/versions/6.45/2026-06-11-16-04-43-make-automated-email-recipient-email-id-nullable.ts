import { createSetNullableMigration } from '../../utils';

const nullableMigration = createSetNullableMigration(
  'automated_email_recipients',
  'automated_email_id',
  { disableForeignKeyChecks: true },
);

export default {
  config: nullableMigration.config,

  async up(config: any) {
    await nullableMigration.up(config);
  },

  async down(config: any) {
    // This should be impossible in practice, but we can't make the column required if anything is null.
    await config.transacting('automated_email_recipients').whereNull('automated_email_id').del();
    await nullableMigration.down(config);
  },
};
