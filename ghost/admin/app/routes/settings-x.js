import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SettingsXRoute extends AuthenticatedRoute {
    @service session;
    @service feature;
    @service ui;
    @service modals;

    activate() {
        super.activate(...arguments);

        // We dont want to go fullscreen if this route is mounted and we are in the new React admin
        if (!this.feature.inAdminForward) {
            this.ui.set('isFullScreen', true);
        }
    }

    deactivate() {
        super.deactivate(...arguments);

        // We dont want to restore from fullscreen if we are in the new React admin
        if (!this.feature.inAdminForward) {
            this.ui.set('isFullScreen', false);
        }
    }

    buildRouteInfoMetadata() {
        return {
            bodyClasses: ['gh-body-fullscreen']
        };
    }
}
