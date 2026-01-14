import Route from '@ember/routing/route';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

Route.reopen({
    billing: service(),
    router: service(),
    config: inject(),

    actions: {
        willTransition(transition) {
            if (this.get('upgradeStatus.isRequired')) {
                transition.abort();
                this.upgradeStatus.requireUpgrade();
                return false;
            } else if (this.config.hostSettings?.forceUpgrade) {
                // Do not prevent transitions to the BMA, to signout, or to any settings-x routes
                if (transition.to?.name === 'pro.index' || transition.to?.name === 'signout' || transition.to?.name.match(/settings-x\.*/)) {
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
