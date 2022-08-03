import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

Route.reopen({
    config: service(),
    billing: service(),
    router: service(),

    actions: {
        willTransition(transition) {
            if (this.get('upgradeStatus.isRequired')) {
                transition.abort();
                this.upgradeStatus.requireUpgrade();
                return false;
            } else if (this.config.get('hostSettings.forceUpgrade')) {
                // Do not prevent transitions to the BMA or to signout
                if (transition.to?.name === 'pro.index' || transition.to?.name === 'signout') {
                    return true;
                }

                transition.abort();
                // Catch and redirect every route in a force upgrade state
                this.billing.openBillingWindow(this.router.currentURL, '/pro');
                return false;
            } else {
                return true;
            }
        }
    }
});
