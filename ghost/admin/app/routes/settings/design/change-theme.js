import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {bind} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default class SettingsDesignChangeThemeRoute extends AuthenticatedRoute {
    @service feature;
    @service modals;

    beforeModel() {
        super.beforeModel(...arguments);

        if (!this.session.user.isAdmin) {
            return this.transitionTo('site');
        }

        if (!this.feature.customThemeSettings) {
            return this.transitionTo('settings');
        }
    }

    activate() {
        this.changeThemeModal = this.modals.open('modals/design/change-theme', {}, {
            className: 'fullscreen-modal-full-overlay fullscreen-modal-action',
            beforeClose: bind(this, this.beforeModalClose)
        });
    }

    deactivate() {
        this.changeThemeModal?.close();
        this.changeThemeModal = null;
    }

    beforeModalClose() {
        this.transitionTo('settings.design');
    }
}
