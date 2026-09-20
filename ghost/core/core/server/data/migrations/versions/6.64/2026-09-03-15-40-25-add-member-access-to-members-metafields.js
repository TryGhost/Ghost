const { createAddColumnMigration } = require('../../utils');

// Every field that already exists lands closed. A permissive default would publish
// what those sites have already collected to the members it was collected about, on
// deploy, without anyone choosing it.
module.exports = createAddColumnMigration('members_metafields', 'member_access', {
  type: 'string',
  maxlength: 50,
  nullable: false,
  defaultTo: 'none',
  validations: { isIn: [['none', 'read', 'write']] },
});
