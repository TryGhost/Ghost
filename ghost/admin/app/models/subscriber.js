import Model from 'ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import attr from 'ember-data/attr';
import {belongsTo} from 'ember-data/relationships';

export default Model.extend(ValidationEngine, {
    validationType: 'subscriber',

    name: attr('string'),
    email: attr('string'),
    status: attr('string'),
    subscribedUrl: attr('string'),
    subscribedReferrer: attr('string'),
    unsubscribedUrl: attr('string'),
    unsubscribedAtUTC: attr('moment-utc'),
    createdAtUTC: attr('moment-utc'),
    updatedAtUTC: attr('moment-utc'),
    createdBy: attr('number'),
    updatedBy: attr('number'),

    post: belongsTo('post')
});
