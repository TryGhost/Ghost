import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SiteRoute extends AuthenticatedRoute {
    @service feature;

    beforeModel() {
        super.beforeModel(...arguments);

        // The React admin owns this screen when the flag is enabled. Hand the
        // URL over to the react-fallback catch-all so this route doesn't run
        // in the hidden Ember app.
        if (this.feature.embedScreensX) {
            return this.replaceWith('react-fallback', 'site');
        }
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
