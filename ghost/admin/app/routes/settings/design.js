import AdminRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SettingsDesignRoute extends AdminRoute {
    @service customThemeSettings;
    @service feature;
    @service modals;
    @service settings;
    @service themeManagement;
    @service ui;
    @service session;

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

    beforeModel() {
        super.beforeModel(...arguments);

        const user = this.session.user;

        if (!user.isAdmin) {
            return this.transitionTo('settings.staff.user', user);
        }
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
