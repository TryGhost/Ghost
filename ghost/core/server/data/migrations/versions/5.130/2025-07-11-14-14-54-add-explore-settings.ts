import { combineTransactionalMigrations, addSetting } from '../../utils';

export default combineTransactionalMigrations(
  addSetting({
    key: 'explore_ping',
    value: 'true',
    type: 'boolean',
    group: 'explore',
  }),
  addSetting({
    key: 'explore_ping_growth',
    value: 'false',
    type: 'boolean',
    group: 'explore',
  }),
);
