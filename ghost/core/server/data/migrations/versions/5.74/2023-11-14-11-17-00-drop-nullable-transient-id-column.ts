import { createDropNullableMigration } from '../../utils';

// We need to disable foreign key checks because if MySQL is missing the STRICT_TRANS_TABLES mode, we cannot revert the migration
export default createDropNullableMigration('members', 'transient_id', {
  disableForeignKeyChecks: true,
});
