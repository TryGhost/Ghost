import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('app_installations', 'identity_key_thumbprint', {
  type: 'string',
  maxlength: 64,
  nullable: false,
});
