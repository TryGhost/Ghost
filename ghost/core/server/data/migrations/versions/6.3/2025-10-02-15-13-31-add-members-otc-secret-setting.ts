import { addSetting } from '../../utils';
import crypto from 'crypto';

export default addSetting({
  key: 'members_otc_secret',
  value: crypto.randomBytes(64).toString('hex'),
  type: 'string',
  group: 'core',
});
