const { combineNonTransactionalMigrations, createAddColumnMigration } = require('../../utils');

// Who wrote the value that is here now: a type and an id, the way `actions` records an
// actor. Both nullable rather than defaulted. Every write from here on names its writer —
// the values service takes it as a required argument, so no call site can omit one — but
// rows written before these columns existed have a writer nobody can recover, and an import
// has no id to give until runs are tracked. Null says exactly that, where a default would
// assert something we would be inventing.
module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration('members_custom_field_values', 'written_by_type', {
    type: 'string',
    maxlength: 50,
    nullable: true,
  }),
  createAddColumnMigration('members_custom_field_values', 'written_by_id', {
    type: 'string',
    maxlength: 24,
    nullable: true,
  }),
);
