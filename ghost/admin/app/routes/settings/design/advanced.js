import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {bind} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default class SettingsDesignAdvancedRoute extends AuthenticatedRoute {
    @service feature;
    @service modals;
    @service store;

    beforeModel() {
        super.beforeModel(...arguments);

        if (!this.session.user.isAdmin) {
            return this.transitionTo('site');
        }

        if (!this.feature.customThemeSettings) {
            return this.transitionTo('settings');
        }

        this.store.findAll('theme');
    }

    activate() {
        this.changeThemeModal = this.modals.open('modals/design/advanced', {}, {
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
