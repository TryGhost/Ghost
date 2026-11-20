import { combineTransactionalMigrations, addSetting } from '../../utils';

export default combineTransactionalMigrations(
  addSetting({
    key: 'portal_signup_terms_html',
    value: null,
    type: 'string',
    group: 'portal',
  }),
  addSetting({
    key: 'portal_signup_checkbox_required',
    value: 'false',
    type: 'boolean',
    group: 'portal',
  }),
);
