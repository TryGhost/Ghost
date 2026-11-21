import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('offers', 'redemption_type', {
  type: 'string',
  maxlength: 50,
  nullable: false,
  defaultTo: 'signup',
});
