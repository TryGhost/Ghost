const { createAddColumnMigration } = require('../../utils');

// A number custom field's value, kept as a number so a filter can compare it by size.
module.exports = createAddColumnMigration(
  'members_metafield_values',
  'value_number',
  { type: 'double', nullable: true },
  { algorithm: 'auto' },
);
