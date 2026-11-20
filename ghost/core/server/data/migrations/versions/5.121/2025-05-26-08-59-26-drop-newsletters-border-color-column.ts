import { createDropColumnMigration } from '../../utils';

export default createDropColumnMigration('newsletters', 'border_color', {
  type: 'string',
  maxlength: 50,
  nullable: true,
});
