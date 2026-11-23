import { createSetNullableMigration } from '../../utils';

// We need to disable foreign key checks because if MySQL is missing the STRICT_TRANS_TABLES mode, we cannot revert the migration
export default createSetNullableMigration('offers', 'product_id', {
  disableForeignKeyChecks: true,
});
