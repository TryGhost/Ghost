import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SettingsXRoute extends AuthenticatedRoute {
    @service session;
    @service feature;
    @service ui;
    @service modals;

    beforeModel() {
        super.beforeModel(...arguments);

        if (!this.feature.adminXSettings) {
            return this.router.transitionTo('settings');
        }
    }

    activate() {
        super.activate(...arguments);
        this.ui.set('isFullScreen', true);
    }

    deactivate() {
        super.deactivate(...arguments);
        this.ui.set('isFullScreen', false);
    }
}
