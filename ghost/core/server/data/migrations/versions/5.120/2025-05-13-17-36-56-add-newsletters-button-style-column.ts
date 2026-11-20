import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('newsletters', 'button_style', {
  type: 'string',
  maxlength: 50,
  nullable: false,
  defaultTo: 'fill',
});
