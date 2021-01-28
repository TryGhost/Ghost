/* eslint-disable ghost/ember/alias-model-in-controller */
import Controller from '@ember/controller';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend({
    ajax: service(),
    config: service(),
    feature: service(),
    ghostPaths: service(),
    notifications: service(),
    session: service(),
    settings: service(),

    importErrors: null,
    importSuccessful: false,
    showDeleteAllModal: false,
    submitting: false,
    uploadButtonText: 'Import',

    importMimeType: null,
    jsonExtension: null,
    jsonMimeType: null,
    yamlExtension: null,
    yamlMimeType: null,

    yamlAccept: null,

    init() {
        this._super(...arguments);
    },

    blogDomain: computed('config.blogDomain', function () {
        let blogDomain = this.config.blogDomain || '';
        const domainExp = blogDomain.replace('https://', '').replace('http://', '').match(new RegExp('^([^/:?#]+)(?:[/:?#]|$)', 'i'));
        return (domainExp && domainExp[1]) || '';
    }),

    actions: {
        setDefaultContentVisibility(value) {
            this.set('settings.defaultContentVisibility', value);
        },

        setStripeConnectIntegrationTokenSetting(stripeConnectIntegrationToken) {
            this.set('settings.stripeConnectIntegrationToken', stripeConnectIntegrationToken);
        }
    },

    saveSettings: task(function* () {
        const response = yield this.settings.save();
        // Reset from address value on save
        return response;
    }).drop(),

    reset() {
        // stripeConnectIntegrationToken is not a persisted value so we don't want
        // to keep it around across transitions
        this.settings.set('stripeConnectIntegrationToken', undefined);
    }
});
