import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {action} from '@ember/object';
import {bind} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default class SettingsDesignCustomizeRoute extends AuthenticatedRoute {
    @service feature;
    @service modals;
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

    activate() {
        this.customizeModal = this.modals.open('modals/design/customize', {}, {
            className: 'fullscreen-modal-full-overlay fullscreen-modal-branding-modal',
            beforeClose: bind(this, this.beforeModalClose)
        });
    }

    @action
    async willTransition(transition) {
        if (this.settings.get('hasDirtyAttributes')) {
            transition.abort();

            const shouldLeave = await this.confirmUnsavedChanges();

            if (shouldLeave) {
                return transition.retry();
            }
        } else {
            return true;
        }
    }

    deactivate() {
        this.customizeModal?.close();
        this.customizeModal = null;
        this.confirmModal = null;
    }

    async beforeModalClose() {
        const shouldLeave = await this.confirmUnsavedChanges();

        if (shouldLeave === true) {
            this.transitionTo('settings.design');
        } else {
            // prevent modal from closing
            return false;
        }
    }

    confirmUnsavedChanges() {
        if (!this.settings.get('hasDirtyAttributes')) {
            return Promise.resolve(true);
        }

        if (!this.confirmModal) {
            this.confirmModal = this.modals.open('modals/confirm-unsaved-changes', {}, {
                className: 'fullscreen-modal-action fullscreen-modal-wide'
            }).then((discardChanges) => {
                if (discardChanges === true) {
                    this.settings.rollbackAttributes();
                }
                return discardChanges;
            }).finally(() => {
                this.confirmModal = null;
            });
        }

        return this.confirmModal;
    }
}
