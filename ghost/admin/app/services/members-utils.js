import Service from '@ember/service';
import {inject as service} from '@ember/service';

export default class MembersUtilsService extends Service {
    @service settings;

    get isStripeEnabled() {
        let membersSubscriptionSettings = this.settings.parseSubscriptionSettings(this.settings.get('membersSubscriptionSettings'));
        let stripeEnabled = membersSubscriptionSettings && !!(membersSubscriptionSettings.paymentProcessors[0].config.secret_token) && !!(membersSubscriptionSettings.paymentProcessors[0].config.public_token);
        return stripeEnabled;
    }
}
