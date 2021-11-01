import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SettingsDesignRoute extends AuthenticatedRoute {
    @service customThemeSettings;
    @service feature;
    @service modals;
    @service settings;
    @service themeManagement;
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
        // background refresh of preview
        // not doing it on the 'index' route so that we don't reload going to/from the index,
        // any actions performed on child routes that need a refresh should trigger it explicitly
        this.themeManagement.updatePreviewHtmlTask.perform();

        // wait for settings to be loaded - we need the data to be present before display
        return Promise.all([
            this.settings.reload(),
            this.customThemeSettings.load()
        ]);
    }

    activate() {
        this.ui.contextualNavMenu = 'design';
    }

    deactivate() {
        this.ui.contextualNavMenu = null;
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Design',
            mainClasses: ['gh-main-fullwidth']
        };
    }
}
