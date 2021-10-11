import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SettingsDesignRoute extends AuthenticatedRoute {
    @service customThemeSettings;
    @service feature;
    @service modals;
    @service settings;
    @service ui;

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
        this.ui.contextualNavMenu = 'design';
    }

    @action
    willTransition(transition) {
        if (this.hasConfirmed) {
            return true;
        }

        // always abort when not confirmed because Ember's router doesn't automatically wait on promises
        transition.abort();

        this.confirmUnsavedChanges().then((shouldLeave) => {
            if (shouldLeave) {
                this.hasConfirmed = true;
                return transition.retry();
            }
        });
    }

    deactivate() {
        this.ui.contextualNavMenu = null;
        this.confirmModal = null;
        this.hasConfirmed = false;
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
