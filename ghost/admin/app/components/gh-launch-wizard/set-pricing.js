import Component from '@glimmer/component';
import {CURRENCIES} from 'ghost-admin/components/gh-members-payments-setting';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class GhLaunchWizardSetPricingComponent extends Component {
    @service settings;

    currencies = CURRENCIES;

    @tracked stripeMonthlyAmount = null;
    @tracked stripeYearlyAmount = null;

    get stripePlans() {
        const plans = this.settings.get('stripePlans') || [];
        const monthly = plans.find(plan => plan.interval === 'month');
        const yearly = plans.find(plan => plan.interval === 'year' && plan.name !== 'Complimentary');

        return {
            monthly: {
                amount: (parseInt(monthly?.amount) || 0) / 100 || 5,
                currency: monthly?.currency || this.currencies[0].value
            },
            yearly: {
                amount: (parseInt(yearly?.amount) || 0) / 100 || 50,
                currency: yearly?.currency || this.currencies[0].value
            }
        };
    }

    get selectedCurrency() {
        return this.currencies.findBy('value', this.stripePlans.monthly.currency);
    }

    willDestroy() {
        // clear any unsaved settings changes when going back/forward/closing
        this.settings.rollbackAttributes();
    }

    @action
    setStripePlansCurrency(event) {
        const newCurrency = event.value;

        const updatedPlans = this.settings.get('stripePlans').map((plan) => {
            if (plan.name !== 'Complimentary') {
                return Object.assign({}, plan, {
                    currency: newCurrency
                });
            }
            return plan;
        });

        const currentComplimentaryPlan = updatedPlans.find((plan) => {
            return plan.name === 'Complimentary' && plan.currency === event.value;
        });

        if (!currentComplimentaryPlan) {
            updatedPlans.push({
                name: 'Complimentary',
                currency: event.value,
                interval: 'year',
                amount: 0
            });
        }

        this.settings.set('stripePlans', updatedPlans);
    }

    @action
    toggleSelfSignup() {
        this.settings.set('membersAllowFreeSignup', !this.settings.get('membersAllowFreeSignup'));
    }

    @action
    validateStripePlans() {
        this.settings.errors.remove('stripePlans');
        this.settings.hasValidated.removeObject('stripePlans');

        if (this.stripeYearlyAmount === null) {
            this.stripeYearlyAmount = this.stripePlans.yearly.amount;
        }
        if (this.stripeMonthlyAmount === null) {
            this.stripeMonthlyAmount = this.stripePlans.monthly.amount;
        }

        try {
            const selectedCurrency = this.selectedCurrency;
            const yearlyAmount = parseInt(this.stripeYearlyAmount);
            const monthlyAmount = parseInt(this.stripeMonthlyAmount);
            if (!yearlyAmount || yearlyAmount < 1 || !monthlyAmount || monthlyAmount < 1) {
                throw new TypeError(`Subscription amount must be at least ${selectedCurrency.symbol}1.00`);
            }

            const updatedPlans = this.settings.get('stripePlans').map((plan) => {
                if (plan.name !== 'Complimentary') {
                    let newAmount;
                    if (plan.interval === 'year') {
                        newAmount = yearlyAmount * 100;
                    } else if (plan.interval === 'month') {
                        newAmount = monthlyAmount * 100;
                    }
                    return Object.assign({}, plan, {
                        amount: newAmount
                    });
                }
                return plan;
            });

            this.settings.set('stripePlans', updatedPlans);
        } catch (err) {
            this.settings.errors.add('stripePlans', err.message);
        } finally {
            this.settings.hasValidated.pushObject('stripePlans');
        }
    }

    @task
    *saveAndContinue() {
        yield this.validateStripePlans();

        if (this.settings.errors.length > 0) {
            return false;
        }

        yield this.settings.save();
        this.args.afterComplete();
    }
}
