import { createAddColumnMigration } from '../../utils';

export default createAddColumnMigration('app_installation_manifests', 'icon_data_url', {
  type: 'text',
  maxlength: 65535,
  nullable: true,
});
