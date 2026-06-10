import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class RevisionsRoute extends AuthenticatedRoute {
    @service feature;
    @service localRevisions;

    beforeModel() {
        super.beforeModel(...arguments);

        // The React admin owns this screen when the flag is enabled. Hand the
        // URL over to the react-fallback catch-all so this route doesn't load
        // data in the hidden Ember app.
        if (this.feature.restoreX) {
            return this.replaceWith('react-fallback', 'restore');
        }
    }

    model() {
        return this.localRevisions.findAll();
    }
}