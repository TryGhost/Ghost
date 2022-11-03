import Component from '@glimmer/component';
import {action} from '@ember/object';
import {getSymbol} from 'ghost-admin/utils/currency';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class extends Component {
    @service membersUtils;
    @service ghostPaths;
    @service ajax;
    @service store;

    @inject config;

    @tracked showTierModal = false;

    get tier() {
        return this.args.tier;
    }

    get showArchiveOption() {
        return this.tier.type === 'paid' && !!this.tier.monthlyPrice;
    }

    get tierCurrency() {
        if (this.isFreeTier) {
            const firstPaidTier = this.args.tiers.find((tier) => {
                return tier.type === 'paid';
            });
            return firstPaidTier?.currency || 'usd';
        } else {
            return this.tier?.currency;
        }
    }

    get isPaidTier() {
        return this.tier.type === 'paid';
    }

    get hasCurrencySymbol() {
        const currencySymbol = getSymbol(this.tier?.monthlyPrice?.currency);
        return currencySymbol?.length !== 3;
    }

    get isFreeTier() {
        return this.tier.type === 'free';
    }

    get isFreeTrialEnabled() {
        return this.tier.trialDays > 0;
    }

    get tierTrialDays() {
        return this.tier.trialDays;
    }

    @action
    async openEditTier(tier) {
        this.args.openEditTier(tier);
    }
}
