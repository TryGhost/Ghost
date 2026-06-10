import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class ExploreRoute extends AuthenticatedRoute {
    @service feature;
    @service store;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // The React admin owns this screen when the flag is enabled. Hand the
        // URL over to the react-fallback catch-all so this route (and its
        // children) doesn't load data or open the explore window in the
        // hidden Ember app.
        if (this.feature.embedScreensX) {
            const url = transition.intent?.url?.split('?')[0];
            return this.replaceWith('react-fallback', url ? url.replace(/^\//, '') : 'explore');
        }
    }

    model() {
        return this.store.findAll('integration');
    }
}
