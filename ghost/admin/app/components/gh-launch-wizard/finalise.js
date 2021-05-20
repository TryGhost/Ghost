import Component from '@glimmer/component';
import {htmlSafe} from '@ember/template';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';

export default class GhLaunchWizardFinaliseComponent extends Component {
    @service feature;
    @service notifications;
    @service router;
    @service settings;

    willDestroy() {
        // clear any unsaved settings changes when going back/forward/closing
        this.settings.rollbackAttributes();
    }

    updatePortalPlans(monthlyPriceId, yearlyPriceId, data) {
        let portalPlans = this.settings.get('portalPlans') || [];
        const currentMontlyPriceId = this.settings.get('membersMonthlyPriceId');
        const currentYearlyPriceId = this.settings.get('membersYearlyPriceId');
        if (portalPlans.includes(currentMontlyPriceId)) {
            portalPlans = portalPlans.filter(priceId => priceId !== currentMontlyPriceId);
        }
        if (data.isMonthlyChecked) {
            portalPlans.pushObject(monthlyPriceId);
        }

        if (portalPlans.includes(currentYearlyPriceId)) {
            portalPlans = portalPlans.filter(priceId => priceId !== currentYearlyPriceId);
        }
        if (data.isYearlyChecked) {
            portalPlans.pushObject(yearlyPriceId);
        }
        portalPlans = portalPlans.filter(priceId => priceId !== 'free');
        if (data.isFreeChecked) {
            portalPlans.pushObject('free');
        }
        this.settings.set('portalPlans', portalPlans);
    }

    async saveProduct() {
        const data = this.args.getData();
        this.product = data?.product;
        if (this.product) {
            const stripePrices = this.product.stripePrices || [];
            const monthlyAmount = data.monthlyAmount * 100;
            const yearlyAmount = data.yearlyAmount * 100;
            const currency = data.currency;
            const getActivePrice = (prices, type, amount) => {
                return prices.find((price) => {
                    return (
                        price.active && price.amount === amount && price.type === 'recurring' &&
                        price.interval === type && price.currency.toLowerCase() === currency.toLowerCase()
                    );
                });
            };
            const monthlyPrice = getActivePrice(stripePrices, 'month', monthlyAmount);
            const yearlyPrice = getActivePrice(stripePrices, 'year', yearlyAmount);

            if (!monthlyPrice) {
                stripePrices.push(
                    {
                        nickname: 'Monthly',
                        amount: monthlyAmount,
                        active: 1,
                        currency: currency,
                        interval: 'month',
                        type: 'recurring'
                    }
                );
            }
            if (!yearlyPrice) {
                stripePrices.push(
                    {
                        nickname: 'Yearly',
                        amount: yearlyAmount,
                        active: 1,
                        currency: currency,
                        interval: 'year',
                        type: 'recurring'
                    }
                );
            }
            if (monthlyPrice && yearlyPrice) {
                this.updatePortalPlans(monthlyPrice.id, yearlyPrice.id, data);
                this.settings.set('membersMonthlyPriceId', monthlyPrice.id);
                this.settings.set('membersYearlyPriceId', yearlyPrice.id);
                return this.product;
            } else {
                this.product.set('stripePrices', stripePrices);
                const savedProduct = await this.product.save();
                const updatedStripePrices = savedProduct.stripePrices || [];
                const updatedMonthlyPrice = getActivePrice(updatedStripePrices, 'month', monthlyAmount);
                const updatedYearlyPrice = getActivePrice(updatedStripePrices, 'year', yearlyAmount);
                this.updatePortalPlans(updatedMonthlyPrice.id, updatedYearlyPrice.id, data);
                this.settings.set('membersMonthlyPriceId', updatedMonthlyPrice.id);
                this.settings.set('membersYearlyPriceId', updatedYearlyPrice.id);
                return savedProduct;
            }
        }
    }

    @task
    *finaliseTask() {
        const data = this.args.getData();
        if (data?.product) {
            yield this.saveProduct();
            yield this.settings.save();
        }
        yield this.feature.set('launchComplete', true);
        this.router.transitionTo('dashboard');
        this.notifications.showNotification(
            'Launch complete!',
            {type: 'success', actions: htmlSafe('<a href="#/posts">Start creating content</a>')}
        );
    }
}
