import { createAddColumnMigration } from '../../utils';

// First make a nullable column
export default createAddColumnMigration('members', 'transient_id', {
  type: 'string',
  maxlength: 191,
  nullable: true,
  unique: true,
});
