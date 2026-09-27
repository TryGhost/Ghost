const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('automations', 'description', {
  type: 'string',
  maxlength: 2000,
  nullable: false,
  defaultTo: '',
});
