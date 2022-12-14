import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

const US = {flag: '🇺🇸', name: 'US', baseUrl: 'https://api.mailgun.net/v3'};
const EU = {flag: '🇪🇺', name: 'EU', baseUrl: 'https://api.eu.mailgun.net/v3'};

export default class Newsletters extends Component {
    @service settings;
    @service feature;

    @inject config;

    // set recipientsSelectValue as a static property because within this
    // component's lifecycle it's not always derived from the settings values.
    // e.g. can be set to "segment" when the filter is empty which is not derivable
    // from settings as it would equate to "none"
    @tracked recipientsSelectValue = this._getDerivedRecipientsSelectValue();

    mailgunRegions = [US, EU];

    get emailNewsletterEnabled() {
        return this.settings.editorDefaultEmailRecipients !== 'disabled';
    }

    get mailgunRegion() {
        if (!this.settings.mailgunBaseUrl) {
            return US;
        }

        return [US, EU].find((region) => {
            return region.baseUrl === this.settings.mailgunBaseUrl;
        });
    }

    get mailgunSettings() {
        return {
            apiKey: this.settings.mailgunApiKey || '',
            domain: this.settings.mailgunDomain || '',
            baseUrl: this.settings.mailgunBaseUrl || ''
        };
    }

    @action
    setMailgunDomain(event) {
        this.settings.mailgunDomain = event.target.value;
        if (!this.settings.mailgunBaseUrl) {
            this.settings.mailgunBaseUrl = this.mailgunRegion.baseUrl;
        }
    }

    @action
    setMailgunApiKey(event) {
        this.settings.mailgunApiKey = event.target.value;
        if (!this.settings.mailgunBaseUrl) {
            this.settings.mailgunBaseUrl = this.mailgunRegion.baseUrl;
        }
    }

    @action
    setMailgunRegion(region) {
        this.settings.mailgunBaseUrl = region.baseUrl;
    }

    @action
    toggleEmailTrackOpens(event) {
        if (event) {
            event.preventDefault();
        }
        this.settings.emailTrackOpens = !this.settings.emailTrackOpens;
    }

    @action
    toggleEmailTrackClicks(event) {
        if (event) {
            event.preventDefault();
        }
        this.settings.emailTrackClicks = !this.settings.emailTrackClicks;
    }

    @action
    toggleEmailNewsletterEnabled(event) {
        if (event) {
            event.preventDefault();
        }

        const newsletterEnabled = !this.emailNewsletterEnabled;

        if (newsletterEnabled) {
            this.settings.editorDefaultEmailRecipients = 'visibility';
        } else {
            this.settings.editorDefaultEmailRecipients = 'disabled';
            this.settings.editorDefaultEmailRecipientsFilter = null;
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
            this.settings.editorDefaultEmailRecipients = value;
            this.settings.editorDefaultEmailRecipientsFilter = null;
        } else {
            this.settings.editorDefaultEmailRecipients = 'filter';
        }

        if (value === 'all-members') {
            this.settings.editorDefaultEmailRecipientsFilter = 'status:free,status:-free';
        }

        if (value === 'paid-only') {
            this.settings.editorDefaultEmailRecipientsFilter = 'status:-free';
        }

        if (value === 'none') {
            this.settings.editorDefaultEmailRecipientsFilter = null;
        }

        // Update the value used to display the selected recipients option explicitly
        // because it's local non-derived state
        this.recipientsSelectValue = value;
    }

    @action
    setDefaultEmailRecipientsFilter(filter) {
        this.settings.editorDefaultEmailRecipientsFilter = filter;
    }

    _getDerivedRecipientsSelectValue() {
        const defaultEmailRecipients = this.settings.editorDefaultEmailRecipients;
        const defaultEmailRecipientsFilter = this.settings.editorDefaultEmailRecipientsFilter;

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
