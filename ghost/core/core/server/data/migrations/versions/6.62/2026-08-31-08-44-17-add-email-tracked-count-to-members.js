const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('members', 'email_tracked_count', {
  type: 'integer',
  nullable: true,
  unsigned: true,
});
