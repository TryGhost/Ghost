import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('posts', 'lexical', {
  type: 'text',
  maxlength: 1000000000,
  fieldtype: 'long',
  nullable: true,
});
