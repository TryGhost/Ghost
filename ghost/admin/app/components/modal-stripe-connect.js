import ModalBase from 'ghost-admin/components/modal-base';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

// TODO: update modals to work fully with Glimmer components
@classic
export default class ModalStripeConnect extends ModalBase {
    @service settings;

    @action
    setStripeConnectIntegrationTokenSetting(stripeConnectIntegrationToken) {
        this.settings.set('stripeConnectIntegrationToken', stripeConnectIntegrationToken);
    }

    @action
    updateSuccessModifier() {
        if (this.settings.get('stripeConnectAccountId')) {
            if (this.modifier?.indexOf('stripe-connected') === -1) {
                this.updateModifier(`${this.modifier} stripe-connected`);
            }
        } else {
            if (this.modifier?.indexOf('stripe-connected') !== -1) {
                this.updateModifier(this.modifier.replace(/\s?stripe-connected/, ''));
            }
        }
    }
}
