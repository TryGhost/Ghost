const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('app_installations', 'identity_key_thumbprint', {
  type: 'string',
  maxlength: 64,
  nullable: false,
});
