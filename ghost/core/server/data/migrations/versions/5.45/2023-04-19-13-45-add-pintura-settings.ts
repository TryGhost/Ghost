import { combineTransactionalMigrations, addSetting } from '../../utils';

export default combineTransactionalMigrations(
  addSetting({
    key: 'pintura',
    value: 'false',
    type: 'boolean',
    group: 'pintura',
  }),
  addSetting({
    key: 'pintura_js_url',
    value: null,
    type: 'string',
    group: 'pintura',
  }),
  addSetting({
    key: 'pintura_css_url',
    value: null,
    type: 'string',
    group: 'pintura',
  }),
);
