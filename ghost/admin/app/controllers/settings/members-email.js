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

    queryParams: ['fromAddressUpdate', 'supportAddressUpdate'],
    fromAddressUpdate: null,
    supportAddressUpdate: null,
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

    fromAddress: computed(function () {
        return this.parseEmailAddress(this.settings.get('membersFromAddress'));
    }),

    supportAddress: computed(function () {
        return this.parseEmailAddress(this.settings.get('membersSupportAddress'));
    }),

    blogDomain: computed('config.blogDomain', function () {
        let blogDomain = this.config.blogDomain || '';
        const domainExp = blogDomain.replace('https://', '').replace('http://', '').match(new RegExp('^([^/:?#]+)(?:[/:?#]|$)', 'i'));
        const domain = (domainExp && domainExp[1]) || '';
        if (domain.startsWith('www.')) {
            return domain.replace(/^(www)\.(?=[^/]*\..{2,5})/, '');
        }
        return domain;
    }),

    actions: {
        setEmailAddress(type, emailAddress) {
            this.set(type, emailAddress);
        }
    },

    parseEmailAddress(address) {
        const emailAddress = address || 'noreply';
        // Adds default domain as site domain
        if (emailAddress.indexOf('@') < 0 && this.blogDomain) {
            return `${emailAddress}@${this.blogDomain}`;
        }
        return emailAddress;
    },

    saveSettings: task(function* () {
        const response = yield this.settings.save();
        // Reset from address value on save
        this.set('fromAddress', this.parseEmailAddress(this.settings.get('membersFromAddress')));
        this.set('supportAddress', this.parseEmailAddress(this.settings.get('membersSupportAddress')));
        return response;
    }).drop(),

    reset() {
        this.set('fromAddressUpdate', null);
        this.set('supportAddressUpdate', null);
    }
});
