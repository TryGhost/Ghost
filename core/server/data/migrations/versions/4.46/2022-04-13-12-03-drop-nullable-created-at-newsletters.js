const {createDropNullableMigration} = require('../../utils');

module.exports = createDropNullableMigration('newsletters', 'created_at');
