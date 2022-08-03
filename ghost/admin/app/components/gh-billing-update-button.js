import Component from '@ember/component';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';

@classic
export default class GhBillingUpdateButton extends Component {
    @service router;
    @service config;
    @service ghostPaths;
    @service ajax;
    @service billing;

    subscription = null;

    @reads('billing.subscription.isActiveTrial')
        showUpgradeButton;

    @action
    openBilling() {
        this.billing.openBillingWindow(this.router.currentURL, '/pro/billing/plans');
    }
}
