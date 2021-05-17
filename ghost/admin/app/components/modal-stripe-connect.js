import ModalBase from 'ghost-admin/components/modal-base';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

// TODO: update modals to work fully with Glimmer components
@classic
export default class ModalStripeConnect extends ModalBase {
    @service settings;

    @action
    setDefaultContentVisibility(value) {
        this.settings.set('defaultContentVisibility', value);
    }

    @action
    setStripeConnectIntegrationTokenSetting(stripeConnectIntegrationToken) {
        this.settings.set('stripeConnectIntegrationToken', stripeConnectIntegrationToken);
    }
}
