import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const US = {flag: '🇺🇸', name: 'US', baseUrl: 'https://api.mailgun.net/v3'};
const EU = {flag: '🇪🇺', name: 'EU', baseUrl: 'https://api.eu.mailgun.net/v3'};

export default class Newsletters extends Component {
    @service config;
    @service settings;

    // set recipientsSelectValue as a static property because within this
    // component's lifecycle it's not always derived from the settings values.
    // e.g. can be set to "segment" when the filter is empty which is not derivable
    // from settings as it would equate to "none"
    @tracked recipientsSelectValue = this._getDerivedRecipientsSelectValue();

    mailgunRegions = [US, EU];

    get emailNewsletterEnabled() {
        return this.settings.get('editorDefaultEmailRecipients') !== 'disabled';
    }

    get mailgunRegion() {
        if (!this.settings.get('mailgunBaseUrl')) {
            return US;
        }

        return [US, EU].find((region) => {
            return region.baseUrl === this.settings.get('mailgunBaseUrl');
        });
    }

    get mailgunSettings() {
        return {
            apiKey: this.settings.get('mailgunApiKey') || '',
            domain: this.settings.get('mailgunDomain') || '',
            baseUrl: this.settings.get('mailgunBaseUrl') || ''
        };
    }

    @action
    setMailgunDomain(event) {
        this.settings.set('mailgunDomain', event.target.value);
        if (!this.settings.get('mailgunBaseUrl')) {
            this.settings.set('mailgunBaseUrl', this.mailgunRegion.baseUrl);
        }
    }

    @action
    setMailgunApiKey(event) {
        this.settings.set('mailgunApiKey', event.target.value);
        if (!this.settings.get('mailgunBaseUrl')) {
            this.settings.set('mailgunBaseUrl', this.mailgunRegion.baseUrl);
        }
    }

    @action
    setMailgunRegion(region) {
        this.settings.set('mailgunBaseUrl', region.baseUrl);
    }

    @action
    toggleEmailTrackOpens(event) {
        if (event) {
            event.preventDefault();
        }
        this.settings.set('emailTrackOpens', !this.settings.get('emailTrackOpens'));
    }

    @action
    toggleEmailNewsletterEnabled(event) {
        if (event) {
            event.preventDefault();
        }

        const newsletterEnabled = !this.emailNewsletterEnabled;

        if (newsletterEnabled) {
            this.settings.set('editorDefaultEmailRecipients', 'visibility');
        } else {
            this.settings.set('editorDefaultEmailRecipients', 'disabled');
            this.settings.set('editorDefaultEmailRecipientsFilter', null);
        }

        this.recipientsSelectValue = this._getDerivedRecipientsSelectValue();

        // Force a save when the toggle is changed
        // this is required
        // eslint-disable-next-line no-console
        this.settings.save().catch(console.error);
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
        this.recipientsSelectValue = value;
    }

    @action
    setDefaultEmailRecipientsFilter(filter) {
        this.settings.set('editorDefaultEmailRecipientsFilter', filter);
    }

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
