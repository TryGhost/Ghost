const { createReplaceCheckMigration } = require('../../utils');
const { exactlyOneCheck } = require('../../../schema/lib/table-checks');

// A row keeps its value in exactly one of the value columns, which now include the boolean one.
module.exports = createReplaceCheckMigration(
  'members_metafield_values',
  exactlyOneCheck('members_metafield_values', ['value_text', 'value_number']),
  exactlyOneCheck('members_metafield_values', ['value_text', 'value_number', 'value_boolean']),
);
