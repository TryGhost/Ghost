import Component from '@glimmer/component';
import copyTextToClipboard from 'ghost-admin/utils/copy-text-to-clipboard';
import {action} from '@ember/object';
import {currencies} from 'ghost-admin/utils/currency';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {task, timeout} from 'ember-concurrency';

const CURRENCIES = currencies.map((currency) => {
    return {
        value: currency.isoCode,
        label: `${currency.isoCode}`
    };
});

export default class TipsAndDonations extends Component {
    @service settings;

    @inject config;

    get allCurrencies() {
        return CURRENCIES;
    }

    get selectedAmount() {
        return this.settings.donationsSuggestedAmount && this.settings.donationsSuggestedAmount / 100;
    }

    get selectedCurrency() {
        return CURRENCIES.findBy('value', this.settings.donationsCurrency);
    }

    get siteUrl() {
        return this.config.blogUrl;
    }

    @task
    *copyTipsAndDonationsLink() {
        const link = document.getElementById('gh-tips-and-donations-link')?.value;

        if (link) {
            copyTextToClipboard(link);
            yield timeout(this.isTesting ? 50 : 500);
        }

        return true;
    }

    @action
    setDonationsCurrency(event) {
        this.settings.donationsCurrency = event.value;
    }

    @action
    setDonationsSuggestedAmount(event) {
        const amount = Math.abs(event.target.value);
        const amountInCents = Math.round(amount * 100);

        this.settings.donationsSuggestedAmount = amountInCents;
    }
}
