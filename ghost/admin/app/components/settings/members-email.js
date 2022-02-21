import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

const US = {flag: '🇺🇸', name: 'US', baseUrl: 'https://api.mailgun.net/v3'};
const EU = {flag: '🇪🇺', name: 'EU', baseUrl: 'https://api.eu.mailgun.net/v3'};

@classic
export default class MembersEmail extends Component {
    @service config;
    @service ghostPaths;
    @service ajax;
    @service settings;

    replyAddresses = null;
    recipientsSelectValue = null;
    showFromAddressConfirmation = false;
    showEmailDesignSettings = false;

    @computed('settings.editorDefaultEmailRecipients')
    get emailNewsletterEnabled() {
        return this.get('settings.editorDefaultEmailRecipients') !== 'disabled';
    }

    @computed('recipientsSelectValue')
    get emailPreviewVisible() {
        return this.recipientsSelectValue !== 'none';
    }

    @computed('settings.membersReplyAddress')
    get selectedReplyAddress() {
        return this.replyAddresses.findBy('value', this.get('settings.membersReplyAddress'));
    }

    @computed('fromAddress')
    get disableUpdateFromAddressButton() {
        const savedFromAddress = this.get('settings.membersFromAddress') || '';
        if (!savedFromAddress.includes('@') && this.config.emailDomain) {
            return !this.fromAddress || (this.fromAddress === `${savedFromAddress}@${this.config.emailDomain}`);
        }
        return !this.fromAddress || (this.fromAddress === savedFromAddress);
    }

    @computed('settings.mailgunBaseUrl')
    get mailgunRegion() {
        if (!this.settings.get('mailgunBaseUrl')) {
            return US;
        }

        return [US, EU].find((region) => {
            return region.baseUrl === this.settings.get('mailgunBaseUrl');
        });
    }

    @computed('settings.{mailgunBaseUrl,mailgunApiKey,mailgunDomain}')
    get mailgunSettings() {
        return {
            apiKey: this.get('settings.mailgunApiKey') || '',
            domain: this.get('settings.mailgunDomain') || '',
            baseUrl: this.get('settings.mailgunBaseUrl') || ''
        };
    }

    init() {
        super.init(...arguments);
        this.set('mailgunRegions', [US, EU]);
        this.set('replyAddresses', [
            {
                label: 'Newsletter email address (' + this.fromAddress + ')',
                value: 'newsletter'
            },
            {
                label: 'Support email address (' + this.supportAddress + ')',
                value: 'support'
            }
        ]);

        // set recipientsSelectValue as a static property because within this
        // component's lifecycle it's not always derived from the settings values.
        // e.g. can be set to "segment" when the filter is empty which is not derivable
        // from settings as it would equate to "none"
        this.set('recipientsSelectValue', this._getDerivedRecipientsSelectValue());
    }

    @action
    toggleFromAddressConfirmation() {
        this.toggleProperty('showFromAddressConfirmation');
    }

    @action
    closeEmailDesignSettings() {
        this.set('showEmailDesignSettings', false);
    }

    @action
    setMailgunDomain(event) {
        this.set('settings.mailgunDomain', event.target.value);
        if (!this.get('settings.mailgunBaseUrl')) {
            this.set('settings.mailgunBaseUrl', this.mailgunRegion.baseUrl);
        }
    }

    @action
    setMailgunApiKey(event) {
        this.set('settings.mailgunApiKey', event.target.value);
        if (!this.get('settings.mailgunBaseUrl')) {
            this.set('settings.mailgunBaseUrl', this.mailgunRegion.baseUrl);
        }
    }

    @action
    setMailgunRegion(region) {
        this.set('settings.mailgunBaseUrl', region.baseUrl);
    }

    @action
    setFromAddress(fromAddress) {
        this.setEmailAddress('fromAddress', fromAddress);
    }

    @action
    toggleEmailTrackOpens(event) {
        if (event) {
            event.preventDefault();
        }
        this.set('settings.emailTrackOpens', !this.settings.get('emailTrackOpens'));
    }

    @action
    toggleEmailNewsletterEnabled(event) {
        if (event) {
            event.preventDefault();
        }

        const newsletterEnabled = !this.emailNewsletterEnabled;

        if (newsletterEnabled) {
            this.set('settings.editorDefaultEmailRecipients', 'visibility');
        } else {
            this.set('settings.editorDefaultEmailRecipients', 'disabled');
            this.set('settings.editorDefaultEmailRecipientsFilter', null);
        }

        this.set('recipientsSelectValue', this._getDerivedRecipientsSelectValue());
    }

    @action
    setReplyAddress(event) {
        const newReplyAddress = event.value;

        this.set('settings.membersReplyAddress', newReplyAddress);
    }

    @action
    setDefaultEmailRecipients(value) {
        // Update the underlying setting properties to match the selected recipients option

        if (['visibility', 'disabled'].includes(value)) {
            this.settings.set('editorDefaultEmailRecipients', value);
            this.settings.set('editorDefaultEmailRecipientsFilter', null);
        } else {
            this.settings.set('editorDefaultEmailRecipients', 'filter');
        }

        if (value === 'all-members') {
            this.settings.set('editorDefaultEmailRecipientsFilter', 'status:free,status:-free');
        }

        if (value === 'paid-only') {
            this.settings.set('editorDefaultEmailRecipientsFilter', 'status:-free');
        }

        if (value === 'none') {
            this.settings.set('editorDefaultEmailRecipientsFilter', null);
        }

        // Update the value used to display the selected recipients option explicitly
        // because it's local non-derived state
        this.set('recipientsSelectValue', value);
    }

    @action
    setDefaultEmailRecipientsFilter(filter) {
        this.settings.set('editorDefaultEmailRecipientsFilter', filter);
    }

    @(task(function* () {
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
    }).drop())
        updateFromAddress;

    _getDerivedRecipientsSelectValue() {
        const defaultEmailRecipients = this.settings.get('editorDefaultEmailRecipients');
        const defaultEmailRecipientsFilter = this.settings.get('editorDefaultEmailRecipientsFilter');

        if (defaultEmailRecipients === 'filter') {
            if (defaultEmailRecipientsFilter === 'status:free,status:-free') {
                return 'all-members';
            } else if (defaultEmailRecipientsFilter === 'status:-free') {
                return 'paid-only';
            } else if (defaultEmailRecipientsFilter === null) {
                return 'none';
            } else {
                return 'segment';
            }
        }

        return defaultEmailRecipients;
    }
}
