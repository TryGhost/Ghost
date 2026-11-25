import { addSetting } from '../../utils';

export default addSetting({
  key: 'llms_enabled',
  value: 'true',
  type: 'boolean',
  group: 'site',
});
