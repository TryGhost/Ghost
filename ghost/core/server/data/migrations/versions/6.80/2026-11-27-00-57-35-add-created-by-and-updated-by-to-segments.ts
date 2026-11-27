import { combineNonTransactionalMigrations, createAddColumnMigration } from '../../utils';

// The staff users who added and last edited each segment. The segments a site already has are
// left without them.
const addUserColumn = (column: string) =>
  createAddColumnMigration(
    'segments',
    column,
    { type: 'string', maxlength: 24, nullable: true },
    { algorithm: 'auto' },
  );

export default combineNonTransactionalMigrations(
  addUserColumn('created_by'),
  addUserColumn('updated_by'),
);
