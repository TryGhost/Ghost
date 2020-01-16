import Model, {attr, belongsTo} from '@ember-data/model';
import {equal} from '@ember/object/computed';

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

    post: belongsTo('post'),

    isSuccess: equal('status', 'submitted'),
    isFailure: equal('status', 'failed'),

    retry() {
        return this.store.adapterFor('email').retry(this);
    }
});
