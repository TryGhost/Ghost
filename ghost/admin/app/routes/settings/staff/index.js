import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend({
    infinity: service(),
    session: service(),

    model() {
        return this.session.user;
    },

    setupController(controller) {
        this._super(...arguments);
        controller.backgroundUpdate.perform();
    },

    actions: {
        reload() {
            this.controller.backgroundUpdate.perform();
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Staff'
        };
    }
});
