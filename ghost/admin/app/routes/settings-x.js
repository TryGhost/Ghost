import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SettingsXRoute extends AuthenticatedRoute {
    @service session;
    @service ui;
    @service modals;

    beforeModel() {
        super.beforeModel(...arguments);

        if (!this.config.adminX?.url) {
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
