import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SiteRoute extends AuthenticatedRoute {
    @service config;
    @service settings;
    @service ui;

    _hasLoggedIn = false;

    model() {
        return (new Date()).valueOf();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Site'
        };
    }
}
