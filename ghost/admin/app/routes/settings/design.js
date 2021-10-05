import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {action} from '@ember/object';
import {bind} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default class SettingsDesignRoute extends AuthenticatedRoute {
    @service customThemeSettings;
    @service feature;
    @service modals;
    @service settings;

    designModal = null;
    confirmModal = null;
    hasConfirmed = false;

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
        this.designModal = this.modals.open('modals/design', {
            saveTask: this.controllerFor('settings.design').saveTask
        }, {
            className: 'fullscreen-modal-total-overlay',
            omitBackdrop: true,
            beforeClose: bind(this, this.beforeModalClose)
        });
    }

    @action
    async willTransition(transition) {
        if (this.settings.get('hasDirtyAttributes') || this.customThemeSettings.isDirty) {
            transition.abort();

            const shouldLeave = await this.confirmUnsavedChanges();
            this.hasConfirmed = true;

            if (shouldLeave) {
                return transition.retry();
            }
        } else {
            this.hasConfirmed = true;
            return true;
        }
    }

    deactivate() {
        this.designModal?.close();
        this.designModal = null;
        this.confirmModal = null;
        this.hasConfirmed = false;
    }

    async beforeModalClose() {
        if (this.hasConfirmed) {
            return;
        }

        const shouldLeave = await this.confirmUnsavedChanges();

        if (shouldLeave === true) {
            this.transitionTo('settings');
        } else {
            // prevent modal from closing
            return false;
        }
    }

    confirmUnsavedChanges() {
        if (!this.settings.get('hasDirtyAttributes') && !this.customThemeSettings.isDirty) {
            return Promise.resolve(true);
        }

        if (!this.confirmModal) {
            this.confirmModal = this.modals.open('modals/confirm-unsaved-changes')
                .then((discardChanges) => {
                    if (discardChanges === true) {
                        this.settings.rollbackAttributes();
                        this.customThemeSettings.rollback();
                    }
                    return discardChanges;
                }).finally(() => {
                    this.confirmModal = null;
                });
        }

        return this.confirmModal;
    }
}
