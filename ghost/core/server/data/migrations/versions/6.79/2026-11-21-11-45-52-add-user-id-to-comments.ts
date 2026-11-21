import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration(
  'comments',
  'user_id',
  {
    type: 'string',
    maxlength: 24,
    nullable: true,
    unique: false,
    references: 'users.id',
    setNullDelete: true,
  },
  { algorithm: 'auto' },
);
