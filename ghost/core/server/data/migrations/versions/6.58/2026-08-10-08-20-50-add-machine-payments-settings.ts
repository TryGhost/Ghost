import crypto from 'crypto';
import { combineTransactionalMigrations, addSetting } from '../../utils';

export default combineTransactionalMigrations(
  addSetting({
    key: 'machine_payments_enabled',
    value: 'false',
    type: 'boolean',
    group: 'site',
  }),
  addSetting({
    key: 'machine_payments_currency',
    value: null,
    type: 'string',
    group: 'site',
  }),
  addSetting({
    key: 'machine_payments_amount',
    value: 100,
    type: 'number',
    group: 'site',
  }),
  addSetting({
    key: 'machine_payments_secret',
    value: crypto.randomBytes(64).toString('hex'),
    type: 'string',
    group: 'core',
  }),
  addSetting({
    key: 'machine_payments_deposit_address',
    value: null,
    type: 'string',
    group: 'core',
  }),
  addSetting({
    key: 'machine_payments_stripe_profile_id',
    value: null,
    type: 'string',
    group: 'site',
  }),
);
