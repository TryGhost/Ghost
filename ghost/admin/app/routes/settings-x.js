import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SettingsXRoute extends AuthenticatedRoute {
    @service session;
    @service feature;
    @service ui;
    @service modals;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        const subPath = transition.to?.params?.sub;
        const userSlug = this.session.user.slug;

        // Handle staff/me redirect - redirect to current user's profile
        // Also handles subpaths like staff/me/edit -> staff/{slug}/edit
        if (subPath?.startsWith('staff/me')) {
            const suffix = subPath.slice('staff/me'.length); // e.g., '/edit' or ''
            return this.transitionTo('settings-x.settings-x', `staff/${userSlug}${suffix}`);
        }

        // Contributors and Authors can only access their own profile in settings
        if (this.session.user.isAuthorOrContributor) {
            const ownProfilePath = `staff/${userSlug}`;

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
