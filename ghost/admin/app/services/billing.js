import Service from '@ember/service';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Service.extend({
    config: service(),
    ghostPaths: service(),

    billingWindowOpen: false,
    upgrade: false,
    action: null,

    closeBillingWindow() {
        this.set('billingWindowOpen', false);
        this.set('action', null);
    },

    endpoint: computed('config.billingUrl', 'billingWindowOpen', 'action', function () {
        let url = this.config.get('billingUrl');

        if (this.get('upgrade')) {
            url = this.ghostPaths.url.join(url, 'plans');
        }

        if (this.get('action')) {
            url += `?action=${this.get('action')}`;
        }

        return url;
    })
});
