import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Model.extend(ValidationEngine, {
    validationType: 'subscriber',

    email: attr('string'),
    createdAt: attr('moment-date'),
    updatedAt: attr('moment-date'),
    createdBy: attr('number'),
    updatedBy: attr('number'),
    unsubscribedAt: attr('moment-date'),

    // TODO: Replace once the API has different states
    status: 'Confirmed'
});
