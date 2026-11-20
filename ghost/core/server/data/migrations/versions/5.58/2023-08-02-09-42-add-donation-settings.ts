import { combineTransactionalMigrations, addSetting } from '../../utils';

export default combineTransactionalMigrations(
  addSetting({
    key: 'donations_currency',
    value: 'USD',
    type: 'string',
    group: 'donations',
  }),
  addSetting({
    key: 'donations_suggested_amount',
    value: 0,
    type: 'number',
    group: 'donations',
  }),
);
