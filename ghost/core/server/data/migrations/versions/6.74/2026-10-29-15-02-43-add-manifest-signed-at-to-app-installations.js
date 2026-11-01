const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('app_installations', 'manifest_signed_at', {
  type: 'bigInteger',
  nullable: false,
});
