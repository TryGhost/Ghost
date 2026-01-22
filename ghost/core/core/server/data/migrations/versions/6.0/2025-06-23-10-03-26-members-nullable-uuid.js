const {createDropNullableMigration} = require('../../utils');

// Running drop nullable migration without foreign key checks disabled
// This is because uuid isn't used as a foreign key anywhere in the schema
module.exports = createDropNullableMigration('members', 'uuid');
