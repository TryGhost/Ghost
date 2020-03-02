import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend({
    config: service(),
    router: service(),

    beforeModel() {
        // Transition to home if billing is not available
        if (!this.get('config.billingUrl')) {
            return this.transitionTo('home');
        }
    },

    model() {
        return (new Date()).valueOf();
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Billing'
        };
    }
});

