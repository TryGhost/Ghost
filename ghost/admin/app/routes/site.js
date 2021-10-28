import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend({
    config: service(),
    settings: service(),
    ui: service(),

    _hasLoggedIn: false,

    model() {
        return (new Date()).valueOf();
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Site'
        };
    }
});
