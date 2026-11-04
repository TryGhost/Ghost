const { createAddColumnMigration } = require('../../utils');

// A yes-or-no custom field's value, kept as a boolean so a filter compares it as one.
module.exports = createAddColumnMigration(
  'members_metafield_values',
  'value_boolean',
  { type: 'boolean', nullable: true },
  { algorithm: 'auto' },
);
