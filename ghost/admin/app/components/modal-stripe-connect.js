import ModalBase from 'ghost-admin/components/modal-base';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

// TODO: update modals to work fully with Glimmer components
@classic
export default class ModalStripeConnect extends ModalBase {
    @service settings;
    @service membersUtils;

    @action
    setStripeConnectIntegrationTokenSetting(stripeConnectIntegrationToken) {
        this.settings.set('stripeConnectIntegrationToken', stripeConnectIntegrationToken);
    }

    @action
    reset() {
        // stripeConnectIntegrationToken is not a persisted value so we don't want
        // to keep it around across transitions
        this.settings.set('stripeConnectIntegrationToken', undefined);
    }

    @action
    close(event) {
        event?.preventDefault?.();
        this.closeModal();
    }

    @action
    confirmAction() {
        this.confirm();
        this.close();
    }

    @action
    updateSuccessModifier() {
        // Note, we should also check isStripeEnabled because stripeDirect option might be enabled
        if (this.membersUtils.get('isStripeEnabled') && this.settings.get('stripeConnectAccountId')) {
            if (this.modifier?.indexOf('stripe-connected') === -1) {
                this.updateModifier(`${this.modifier} stripe-connected`);
            }
        } else {
            if (this.modifier?.indexOf('stripe-connected') !== -1) {
                this.updateModifier(this.modifier.replace(/\s?stripe-connected/, ''));
            }
        }
    }

    actions = {
        confirm() {
            if (this.settings.get('stripeConnectAccountId')) {
                return this.confirmAction();
            }
            // noop - enter key shouldn't do anything
        },
        // needed because ModalBase uses .send() for keyboard events
        closeModal() {
            this.close();
        }
    };
}
