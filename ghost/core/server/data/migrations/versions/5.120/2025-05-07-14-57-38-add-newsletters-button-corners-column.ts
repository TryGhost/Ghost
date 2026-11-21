import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('newsletters', 'button_corners', {
  type: 'string',
  maxlength: 50,
  nullable: false,
  defaultTo: 'rounded',
});
