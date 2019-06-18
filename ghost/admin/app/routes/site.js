import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend({

    ui: service(),

    model() {
        return (new Date()).valueOf();
    },

    activate() {
        this._super(...arguments);
    },

    deactivate() {
        this._super(...arguments);
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Site'
        };
    }
});
