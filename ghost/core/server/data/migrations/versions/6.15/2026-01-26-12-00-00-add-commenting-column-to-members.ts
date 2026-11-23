import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('members', 'commenting', {
  type: 'text',
  maxlength: 65535,
  nullable: true,
});
