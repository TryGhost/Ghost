import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import {belongsTo} from 'ember-data/relationships';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Model.extend(ValidationEngine, {
    validationType: 'subscriber',

    uuid: attr('string'),
    name: attr('string'),
    email: attr('string'),
    status: attr('string'),
    subscribedUrl: attr('string'),
    subscribedReferrer: attr('string'),
    unsubscribedUrl: attr('string'),
    unsubscribedAt: attr('moment-date'),
    createdAt: attr('moment-date'),
    updatedAt: attr('moment-date'),
    createdBy: attr('number'),
    updatedBy: attr('number'),

    post: belongsTo('post')
});
