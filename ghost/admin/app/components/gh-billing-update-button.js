import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    config: service(),
    ghostPaths: service(),
    ajax: service(),
    billing: service(),

    subscription: null,

    showUpgradeButton: computed.equal('subscription.status', 'trialing'),

    didRender() {
        let iframe = this.element.querySelector('#billing-frame-global');
        let fetchingSubscription = false;

        window.addEventListener('message', (event) => {
            if (event && event.data && event.data.request === 'token') {
                const ghostIdentityUrl = this.get('ghostPaths.url').api('identities');

                this.ajax.request(ghostIdentityUrl).then((response) => {
                    const token = response && response.identities && response.identities[0] && response.identities[0].token;
                    iframe.contentWindow.postMessage({
                        request: 'token',
                        response: token
                    }, '*');
                });

                // NOTE: the handler is placed here to avoid additional logic to check if iframe has loaded
                //       receiving a 'token' request is an indication that page is ready
                if (!fetchingSubscription && !this.get('subscription')) {
                    fetchingSubscription = true;
                    iframe.contentWindow.postMessage({
                        query: 'getSubscription',
                        response: 'subscription'
                    }, '*');
                }
            }

            if (event && event.data && event.data.subscription) {
                this.set('subscription', event.data.subscription);
            }
        });
    },

    actions: {
        openBilling() {
            this.billing.set('upgrade', true);
            this.billing.toggleProperty('billingWindowOpen');
        }
    }
});
