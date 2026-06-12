import AuthConfiguration from 'ember-simple-auth/configuration';
import Route from '@ember/routing/route';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {inject as service} from '@ember/service';

export default class AuthenticatedRoute extends Route {
    @service feature;
    @service session;

    async beforeModel(transition) {
        // When the React auth screens own the signin flow (authX), they also
        // own the ghost-signin-redirect key: the hidden Ember app boots and
        // redirects through authenticated routes while React is still
        // resolving its post-login deep link, and clearing the key here would
        // race that read.
        const reactOwnsSigninRedirect = this.feature.authX;

        if (reactOwnsSigninRedirect && !this.session.isAuthenticated) {
            // The React auth screens own the signed-out flow: they store the
            // attempted deep link and redirect to their signin screen. Ember's
            // hard replaceLocation to the admin root would wipe the URL (and
            // with it the deep link) before React can store it — just park
            // the hidden Ember app instead.
            transition.abort();
            return;
        }

        if (!this.session.isAuthenticated) {
            const url = transition.intent?.url;
            if (url) {
                window.sessionStorage.setItem('ghost-signin-redirect', url);
            }
        } else if (!reactOwnsSigninRedirect) {
            window.sessionStorage.removeItem('ghost-signin-redirect');
        }

        this.session.requireAuthentication(transition, () => {
            windowProxy.replaceLocation(AuthConfiguration.rootURL);
        });
    }
}
