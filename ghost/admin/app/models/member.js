import Model, {attr, hasMany} from '@ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Model.extend(ValidationEngine, {
    validationType: 'member',

    name: attr('string'),
    email: attr('string'),
    note: attr('string'),
    status: attr('string'),
    createdAtUTC: attr('moment-utc'),
    subscriptions: attr('member-subscription'),
    subscribed: attr('boolean', {defaultValue: true}),
    comped: attr('boolean', {defaultValue: false}),
    geolocation: attr('json-string'),
    emailCount: attr('number', {defaultValue: 0}),
    emailOpenedCount: attr('number', {defaultValue: 0}),
    emailOpenRate: attr('number'),

    products: attr('member-product'),

    labels: hasMany('label', {embedded: 'always', async: false}),
    emailRecipients: hasMany('emailRecipient', {embedded: 'always', async: false}),

    ghostPaths: service(),
    ajax: service(),

    // remove client-generated labels, which have `id: null`.
    // Ember Data won't recognize/update them automatically
    // when returned from the server with ids.
    // https://github.com/emberjs/data/issues/1829
    updateLabels() {
        let labels = this.labels;
        let oldLabels = labels.filterBy('id', null);

        labels.removeObjects(oldLabels);
        oldLabels.invoke('deleteRecord');
    },

    fetchSigninUrl: task(function* () {
        let url = this.get('ghostPaths.url').api('members', this.get('id'), 'signin_urls');

        let response = yield this.ajax.request(url);

        return response.member_signin_urls[0];
    }).drop()
});
