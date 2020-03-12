import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    config: service(),
    ghostPaths: service(),
    ajax: service(),

    billingEndpoint: computed.reads('config.billingUrl'),

    didRender() {
        let iframe = this.element.querySelector('#billing-frame');
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
            }
        });
    }
});
