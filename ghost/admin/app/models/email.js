import Model, {attr, belongsTo} from '@ember-data/model';
import {computed} from '@ember/object';
import {equal} from '@ember/object/computed';

export default Model.extend({
    error: attr('string'),
    html: attr('string'),
    plaintext: attr('string'),
    stats: attr('json-string'),
    status: attr('string'),
    subject: attr('string'),
    submittedAtUTC: attr('moment-utc'),
    uuid: attr('string'),
    recipientFilter: attr('string'),

    emailCount: attr('number', {defaultValue: 0}),
    deliveredCount: attr('number', {defaultValue: 0}),
    openedCount: attr('number', {defaultValue: 0}),
    failedCount: attr('number', {defaultValue: 0}),

    trackOpens: attr('boolean'),
    trackClicks: attr('boolean'),

    feedbackEnabled: attr('boolean'),

    createdAtUTC: attr('moment-utc'),
    createdBy: attr('string'),
    updatedAtUTC: attr('moment-utc'),
    updatedBy: attr('string'),

    post: belongsTo('post'),

    isSuccess: equal('status', 'submitted'),
    isFailure: equal('status', 'failed'),

    openRate: computed('emailCount', 'openedCount', function () {
        let {emailCount, openedCount} = this;

        if (emailCount === 0) {
            return 0;
        }

        return Math.round(openedCount / emailCount * 100);
    }),

    retry() {
        return this.store.adapterFor('email').retry(this);
    }
});
