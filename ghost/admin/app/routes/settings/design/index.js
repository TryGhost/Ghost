import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import ConfirmUnsavedChangesModal from '../../../components/modals/confirm-unsaved-changes';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SettingsDesignIndexRoute extends AuthenticatedRoute {
    @service customThemeSettings;
    @service modals;
    @service settings;
    @service store;

    confirmModal = null;
    hasConfirmed = false;
    themes = this.store.peekAll('theme');

    afterModel() {
        super.afterModel(...arguments);
        let activeTheme = this.themes.findBy('active', true);
        if (typeof activeTheme === 'undefined') {
            return this.transitionTo('settings.design.no-theme');
        }
    }

    @action
    willTransition(transition) {
        if (this.hasConfirmed) {
            return true;
        }

        // always abort when not confirmed because Ember's router doesn't automatically wait on promises
        transition.abort();

        this.confirmUnsavedChanges().then((shouldLeave) => {
            if (shouldLeave === true) {
                this.hasConfirmed = true;
                return transition.retry();
            }
        });
    }

    deactivate() {
        this.confirmModal = null;
        this.hasConfirmed = false;

        this.controllerFor('settings.design.index').reset();
    }

    confirmUnsavedChanges() {
        if (!this.settings.hasDirtyAttributes && !this.customThemeSettings.isDirty) {
            return Promise.resolve(true);
        }

        if (!this.confirmModal) {
            this.confirmModal = this.modals.open(ConfirmUnsavedChangesModal)
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
