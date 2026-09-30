const { createAddIndexMigration } = require('../../utils');

module.exports = createAddIndexMigration('email_recipients', [
  'member_id',
  'opened_at',
  'email_id',
]);
