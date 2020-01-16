import Model, {attr, hasMany} from '@ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {computed} from '@ember/object';

export default Model.extend(ValidationEngine, {
    validationType: 'integration',

    name: attr('string'),
    slug: attr('string'),
    type: attr('string'),
    iconImage: attr('string'),
    description: attr('string'),
    createdAtUTC: attr('moment-utc'),
    createdBy: attr('number'),
    updatedAtUTC: attr('moment-utc'),
    updatedBy: attr('number'),

    apiKeys: hasMany('api-key', {
        embedded: 'always',
        async: false
    }),
    webhooks: hasMany('webhook', {
        embedded: 'always',
        async: false
    }),

    adminKey: computed('apiKeys.[]', function () {
        return this.apiKeys.findBy('type', 'admin');
    }),

    contentKey: computed('apiKeys.[]', function () {
        return this.apiKeys.findBy('type', 'content');
    })
});
