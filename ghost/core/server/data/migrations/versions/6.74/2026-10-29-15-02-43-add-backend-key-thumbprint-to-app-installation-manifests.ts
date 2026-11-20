import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('app_installation_manifests', 'backend_key_thumbprint', {
  type: 'string',
  maxlength: 64,
  nullable: false,
});
