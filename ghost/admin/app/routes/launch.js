import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class LaunchRoute extends AuthenticatedRoute {
    @service session;
    @service ui;

    activate() {
        // disable before rendering template to avoid issues with liquid-wormhole
        // attempting to destroy elements mid-render if disabled via component hooks
        this.ui.set('showTour', false);
    }

    deactivate() {
        this.ui.set('showTour', true);
    }

    beforeModel() {
        super.beforeModel(...arguments);
        return this.session.user.then((user) => {
            if (!user.isOwner) {
                return this.transitionTo('home');
            }
        });
    }
}
