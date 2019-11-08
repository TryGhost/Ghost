import Model from 'ember-data/model';
import attr from 'ember-data/attr';
import {belongsTo} from 'ember-data/relationships';

export default Model.extend({
    emailCount: attr('number'),
    error: attr('string'),
    html: attr('string'),
    plaintext: attr('string'),
    stats: attr('json-string'),
    status: attr('string'),
    subject: attr('string'),
    submittedAtUTC: attr('moment-utc'),
    uuid: attr('string'),

    createdAtUTC: attr('moment-utc'),
    createdBy: attr('string'),
    updatedAtUTC: attr('moment-utc'),
    updatedBy: attr('string'),

    post: belongsTo('post')
});
