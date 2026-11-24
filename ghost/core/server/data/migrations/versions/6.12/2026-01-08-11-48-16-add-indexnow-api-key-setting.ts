import crypto from 'crypto';
import { addSetting } from '../../utils';

export default addSetting({
  key: 'indexnow_api_key',
  value: crypto.randomBytes(16).toString('hex'),
  type: 'string',
  group: 'indexnow',
});
