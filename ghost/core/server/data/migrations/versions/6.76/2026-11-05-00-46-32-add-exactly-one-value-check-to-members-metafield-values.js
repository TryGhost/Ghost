const { createAddCheckMigration } = require('../../utils');
const { exactlyOneCheck } = require('../../../schema/lib/table-checks');

// A row keeps its value in exactly one of the value columns, the one its kind is kept in. Held
// by the database, so it binds every writer rather than only the code that remembers it.
module.exports = createAddCheckMigration(
  'members_metafield_values',
  exactlyOneCheck('members_metafield_values', ['value_text', 'value_number']),
);
