import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class DashboardRoute extends AuthenticatedRoute {
    @service feature;
    @service settings;

    beforeModel() {
        super.beforeModel(...arguments);

        if (!this.session.user.isAdmin) {
            return this.transitionTo('site');
        }

        if (!this.feature.customThemeSettings) {
            return this.transitionTo('settings');
        }
    }

    model() {
        return this.settings.reload();
    }

    buildRouteInfoMetadata() {
        return {
            mainClasses: ['gh-main-wide']
        };
    }
}
