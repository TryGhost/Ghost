import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    router: service(),
    config: service(),
    ghostPaths: service(),
    ajax: service(),
    billing: service(),

    subscription: null,

    showUpgradeButton: computed.reads('billing.subscription.isActiveTrial'),

    actions: {
        openBilling() {
            this.billing.openBillingWindow(this.router.currentURL, '/pro/billing/plans');
        }
    }
});
