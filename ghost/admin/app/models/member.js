import Model, {attr} from '@ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

export default Model.extend(ValidationEngine, {
    validationType: 'member',

    name: attr('string'),
    email: attr('string'),
    note: attr('string'),
    createdAtUTC: attr('moment-utc'),
    stripe: attr('member-subscription'),
    subscribed: attr('boolean', {defaultValue: true}),
    comped: attr('boolean', {defaultValue: false})
});
