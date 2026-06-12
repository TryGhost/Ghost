import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class MigrateRoute extends AuthenticatedRoute {
    @service feature;
    @service session;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // The React admin owns this screen when the flag is enabled. Hand the
        // URL over to the react-fallback catch-all so this route doesn't run
        // guards in the hidden Ember app (the React screen enforces the
        // admin-only guard itself).
        if (this.feature.embedScreensX) {
            const url = transition.intent?.url?.split('?')[0];
            return this.replaceWith('react-fallback', url ? url.replace(/^\//, '') : 'migrate');
        }

        // Only allow Owner & Administrator to access this route
        if (!this.session.user.isAdmin) {
            return this.transitionTo('home');
        }
    }
}
