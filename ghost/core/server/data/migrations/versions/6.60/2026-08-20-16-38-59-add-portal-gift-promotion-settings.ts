import { addSetting, combineTransactionalMigrations } from '../../utils';

export default combineTransactionalMigrations(
  addSetting({
    key: 'portal_signup_gift_promotion',
    value: 'true',
    type: 'boolean',
    group: 'portal',
  }),
  addSetting({
    key: 'portal_account_gift_promotion',
    value: 'true',
    type: 'boolean',
    group: 'portal',
  }),
);
