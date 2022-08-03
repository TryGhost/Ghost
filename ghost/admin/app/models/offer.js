import Model, {attr} from '@ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';

export default Model.extend(ValidationEngine, {
    validationType: 'offer',

    name: attr('string'),
    code: attr('string'),
    cadence: attr('string'),
    status: attr('string', {defaultValue: 'active'}),
    tier: attr(),
    stripeCouponId: attr('string'),
    redemptionCount: attr('number'),
    currency: attr('string'),
    type: attr('string', {defaultValue: 'percent'}),
    amount: attr('number'),
    duration: attr('string', {defaultValue: 'once'}),
    durationInMonths: attr('number'),
    displayTitle: attr('string'),
    displayDescription: attr('string'),
    createdAtUTC: attr('moment-utc'),
    updatedAtUTC: attr('moment-utc')
});
