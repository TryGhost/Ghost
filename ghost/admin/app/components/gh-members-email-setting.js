import Component from '@ember/component';
import {computed} from '@ember/object';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

const US = {flag: '🇺🇸', name: 'US', baseUrl: 'https://api.mailgun.net/v3'};
const EU = {flag: '🇪🇺', name: 'EU', baseUrl: 'https://api.eu.mailgun.net/v3'};

const REPLY_ADDRESSES = [
    {
        label: 'Newsletter email address',
        value: 'newsletter'
    },
    {
        label: 'Support email address',
        value: 'support'
    }
];

export default Component.extend({
    config: service(),
    ghostPaths: service(),
    ajax: service(),
    settings: service(),

    replyAddresses: null,
    showFromAddressConfirmation: false,
    showSupportAddressConfirmation: false,
    showEmailDesignSettings: false,

    mailgunIsConfigured: reads('config.mailgunIsConfigured'),
    emailTrackOpens: reads('settings.emailTrackOpens'),

    selectedReplyAddress: computed('settings.membersReplyAddress', function () {
        return REPLY_ADDRESSES.findBy('value', this.get('settings.membersReplyAddress'));
    }),

    disableUpdateFromAddressButton: computed('fromAddress', function () {
        const savedFromAddress = this.get('settings.membersFromAddress') || '';
        if (!savedFromAddress.includes('@') && this.config.emailDomain) {
            return !this.fromAddress || (this.fromAddress === `${savedFromAddress}@${this.config.emailDomain}`);
        }
        return !this.fromAddress || (this.fromAddress === savedFromAddress);
    }),

    disableUpdateSupportAddressButton: computed('supportAddress', function () {
        const savedSupportAddress = this.get('settings.membersSupportAddress') || '';
        if (!savedSupportAddress.includes('@') && this.config.emailDomain) {
            return !this.supportAddress || (this.supportAddress === `${savedSupportAddress}@${this.config.emailDomain}`);
        }
        return !this.supportAddress || (this.supportAddress === savedSupportAddress);
    }),

    mailgunRegion: computed('settings.mailgunBaseUrl', function () {
        if (!this.settings.get('mailgunBaseUrl')) {
            return US;
        }

        return [US, EU].find((region) => {
            return region.baseUrl === this.settings.get('mailgunBaseUrl');
        });
    }),

    mailgunSettings: computed('settings.{mailgunBaseUrl,mailgunApiKey,mailgunDomain}', function () {
        return {
            apiKey: this.get('settings.mailgunApiKey') || '',
            domain: this.get('settings.mailgunDomain') || '',
            baseUrl: this.get('settings.mailgunBaseUrl') || ''
        };
    }),

    init() {
        this._super(...arguments);
        this.set('mailgunRegions', [US, EU]);
        this.set('replyAddresses', REPLY_ADDRESSES);
    },

    actions: {
        toggleFromAddressConfirmation() {
            this.toggleProperty('showFromAddressConfirmation');
        },

        closeEmailDesignSettings() {
            this.set('showEmailDesignSettings', false);
        },

        setMailgunDomain(event) {
            this.set('settings.mailgunDomain', event.target.value);
            if (!this.get('settings.mailgunBaseUrl')) {
                this.set('settings.mailgunBaseUrl', this.mailgunRegion.baseUrl);
            }
        },

        setMailgunApiKey(event) {
            this.set('settings.mailgunApiKey', event.target.value);
            if (!this.get('settings.mailgunBaseUrl')) {
                this.set('settings.mailgunBaseUrl', this.mailgunRegion.baseUrl);
            }
        },

        setMailgunRegion(region) {
            this.set('settings.mailgunBaseUrl', region.baseUrl);
        },

        setFromAddress(fromAddress) {
            this.setEmailAddress('fromAddress', fromAddress);
        },

        setSupportAddress(supportAddress) {
            this.setEmailAddress('supportAddress', supportAddress);
        },

        toggleEmailTrackOpens(event) {
            if (event) {
                event.preventDefault();
            }
            this.set('settings.emailTrackOpens', !this.get('emailTrackOpens'));
        },

        setReplyAddress(event) {
            const newReplyAddress = event.value;

            this.set('settings.membersReplyAddress', newReplyAddress);
        }
    },

    updateFromAddress: task(function* () {
        let url = this.get('ghostPaths.url').api('/settings/members/email');
        try {
            const response = yield this.ajax.post(url, {
                data: {
                    email: this.fromAddress,
                    type: 'fromAddressUpdate'
                }
            });
            this.toggleProperty('showFromAddressConfirmation');
            return response;
        } catch (e) {
            // Failed to send email, retry
            return false;
        }
    }).drop(),

    updateSupportAddress: task(function* () {
        let url = this.get('ghostPaths.url').api('/settings/members/email');
        try {
            const response = yield this.ajax.post(url, {
                data: {
                    email: this.supportAddress,
                    type: 'supportAddressUpdate'
                }
            });
            this.toggleProperty('showSupportAddressConfirmation');
            return response;
        } catch (e) {
            // Failed to send email, retry
            return false;
        }
    }).drop()
});
