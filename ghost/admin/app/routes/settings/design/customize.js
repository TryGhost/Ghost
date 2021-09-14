import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class SettingsDesignCustomizeRoute extends AuthenticatedRoute {
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
        this.modals.open('modals/design/customize', {}, {
            className: 'fullscreen-modal-full-overlay fullscreen-modal-branding-modal'
        });
    }

    deactivate() {
        this.modals._stack.reverse().forEach((modal) => {
            modal._componentInstance.closeModal();
        });
    }
}
