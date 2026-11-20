import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('tokens', 'uuid', {
  type: 'string',
  maxlength: 36,
  nullable: true,
  unique: true,
});
