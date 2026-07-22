import AuthConfiguration from 'ember-simple-auth/configuration';
import Route from '@ember/routing/route';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {inject as service} from '@ember/service';

export default class AuthenticatedRoute extends Route {
    @service session;

    async beforeModel(transition) {
        if (!this.session.isAuthenticated) {
            const url = transition.intent?.url;
            if (url) {
                window.sessionStorage.setItem('ghost-signin-redirect', url);
            }
        } else {
            window.sessionStorage.removeItem('ghost-signin-redirect');
        }

        this.session.requireAuthentication(transition, () => {
            windowProxy.replaceLocation(AuthConfiguration.rootURL);
        });
    }
}
