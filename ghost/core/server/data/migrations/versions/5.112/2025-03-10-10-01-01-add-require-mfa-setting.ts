import { addSetting } from '../../utils';

export default addSetting({
  key: 'require_email_mfa',
  value: 'false',
  type: 'boolean',
  group: 'security',
});
