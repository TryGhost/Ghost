import { addSetting } from '../../utils';

export default addSetting({
  key: 'blocked_email_domains',
  value: '[]',
  type: 'array',
  group: 'members',
});
