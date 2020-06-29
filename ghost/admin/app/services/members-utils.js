import Service from '@ember/service';
import {inject as service} from '@ember/service';

export default class MembersUtilsService extends Service {
    @service settings;
    @service config;

    get isStripeEnabled() {
        const stripeDirect = this.config.get('stripeDirect');

        const hasDirectKeys = !!this.settings.get('stripeSecretKey') && !!this.settings.get('stripePublishableKey');
        const hasConnectKeys = !!this.settings.get('stripeConnectSecretKey') && !!this.settings.get('stripeConnectPublishableKey');

        if (stripeDirect) {
            return hasDirectKeys;
        }

        return hasConnectKeys || hasDirectKeys;
    }
}
