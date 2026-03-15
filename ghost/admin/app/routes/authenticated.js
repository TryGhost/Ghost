import AuthConfiguration from 'ember-simple-auth/configuration';
import Route from '@ember/routing/route';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {inject as service} from '@ember/service';

export default class AuthenticatedRoute extends Route {
    @service feature;
    @service session;

    async beforeModel(transition) {
        if (this.feature.inAdminForward) {
            this.session.requireAuthentication(transition, () => {
                windowProxy.replaceLocation(AuthConfiguration.rootURL);
            });
        } else {
            this.session.requireAuthentication(transition, 'signin');
        }
    }
}
