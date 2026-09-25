import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class MigrateRoute extends AuthenticatedRoute {
    @service feature;
    @service router;
    @service session;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // Only allow Owner & Administrator to access this route
        if (!this.session.user.isAdmin) {
            return this.transitionTo('index');
        }

        // React owns /migrate/* when the flag is on; parking keeps Ember's route state honest.
        if (this.feature.iframeRoutesReact !== true) {
            return;
        }

        transition.abort();

        const platform = transition.to?.params?.platform;
        const path = platform ? `migrate/${platform}` : 'migrate';

        if (!transition.intent?.url) {
            this._navigateToReactRoute(`/${path}`);
        }

        const parkedPath = this.router.currentRouteName === 'react-fallback'
            ? this.router.currentRoute?.params?.path
            : null;
        if (parkedPath !== path) {
            this.router.replaceWith('react-fallback', path).method(null);
        }
    }

    _navigateToReactRoute(url) {
        window.location.hash = url;
    }
}
