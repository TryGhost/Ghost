const { createSetNullableMigration } = require('../../utils');

// A row keeps its value in the column its kind is kept in, and only there, so a number's row has
// no text.
module.exports = createSetNullableMigration('members_metafield_values', 'value_text');
