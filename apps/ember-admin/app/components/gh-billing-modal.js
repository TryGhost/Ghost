import Component from '@glimmer/component';
import {inject as service} from '@ember/service';

export default class GhBillingModal extends Component {
    @service billing;

    get visibilityClass() {
        return this.args.billingWindowOpen ? 'gh-billing' : 'gh-billing closed';
    }

    get showLoadingState() {
        return this.args.billingWindowOpen
            && !this.billing.billingAppLoaded
            && !this.billing.billingAppLoadFailureReported;
    }

    get showErrorState() {
        return this.args.billingWindowOpen
            && this.billing.billingAppLoadFailureReported
            && !this.billing.billingAppLoaded;
    }
}
