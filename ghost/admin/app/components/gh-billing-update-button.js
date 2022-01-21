import Component from '@ember/component';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Component.extend({
    router: service(),
    config: service(),
    ghostPaths: service(),
    ajax: service(),
    billing: service(),

    subscription: null,

    showUpgradeButton: reads('billing.subscription.isActiveTrial'),

    actions: {
        openBilling() {
            this.billing.openBillingWindow(this.router.currentURL, '/pro/billing/plans');
        }
    }
});
