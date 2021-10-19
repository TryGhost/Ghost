import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SettingsDesignRoute extends AuthenticatedRoute {
    @service feature;
    @service modals;
    @service settings;
    @service ui;

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

    activate() {
        this.ui.contextualNavMenu = 'design';
    }

    deactivate() {
        this.ui.contextualNavMenu = null;
    }

    buildRouteInfoMetadata() {
        return {
            mainClasses: ['gh-main-fullwidth']
        };
    }
}
