const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('app_installations', 'manifest_signed_digest', {
  type: 'string',
  maxlength: 64,
  nullable: false,
});
