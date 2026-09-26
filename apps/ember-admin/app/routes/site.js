import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SiteRoute extends AuthenticatedRoute {
    @service feature;
    @service router;

    // React owns /site when the flag is on; parking keeps Ember's route state honest.
    beforeModel(transition) {
        const result = super.beforeModel(...arguments);
        if (this.feature.iframeRoutesReact !== true) {
            return result;
        }

        transition.abort();

        if (!transition.intent?.url) {
            this._navigateToReactRoute('/site');
        }

        const parkedPath = this.router.currentRouteName === 'react-fallback'
            ? this.router.currentRoute?.params?.path
            : null;
        if (parkedPath !== 'site') {
            this.router.replaceWith('react-fallback', 'site').method(null);
        }
    }

    _navigateToReactRoute(url) {
        window.location.hash = url;
    }

    model() {
        return (new Date()).valueOf();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Site'
        };
    }
}
