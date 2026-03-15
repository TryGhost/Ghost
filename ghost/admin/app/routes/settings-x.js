import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SettingsXRoute extends AuthenticatedRoute {
    @service session;
    @service feature;
    @service ui;
    @service modals;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // Contributors and Authors can only access their own profile in settings
        if (this.session.user.isAuthorOrContributor) {
            // Check if they're trying to access their own profile route
            const subPath = transition.to?.params?.sub;
            const ownProfilePath = `staff/${this.session.user.slug}`;

            // Only allow access to their own profile, redirect everything else
            if (subPath !== ownProfilePath) {
                return this.transitionTo('settings-x.settings-x', ownProfilePath);
            }
        }
    }

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
