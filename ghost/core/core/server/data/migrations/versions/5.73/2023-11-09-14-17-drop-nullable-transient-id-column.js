const {createDropNullableMigration} = require('../../utils');

// We need to disable foreign key checks because if MySQL is missing the STRICT_TRANS_TABLES mode, we cannot revert the migration
module.exports = createDropNullableMigration('members', 'transient_id', {disableForeignKeyChecks: true});
