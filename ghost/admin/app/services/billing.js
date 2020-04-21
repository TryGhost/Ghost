import Service from '@ember/service';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Service.extend({
    config: service(),
    ghostPaths: service(),

    init() {
        this._super(...arguments);
        this.billingWindowOpen = false;
    },

    billingWindowOpen: false,
    upgrade: true,

    endpoint: computed('config.billingUrl', 'billingWindowOpen', function () {
        let url = this.config.get('billingUrl');

        if (this.get('upgrade')) {
            url = this.ghostPaths.url.join(url, 'plans');
        }

        return url;
    })
});
