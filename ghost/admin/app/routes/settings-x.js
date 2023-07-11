import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import ConfirmUnsavedChangesModal from '../components/modals/confirm-unsaved-changes';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class SettingsXRoute extends AuthenticatedRoute {
    @service session;
    @service ui;
    @service modals;

    beforeModel() {
        super.beforeModel(...arguments);

        const user = this.session.user;

        if (!user.isAdmin) {
            return this.transitionTo('settings.staff.user', user);
        }

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

    @action
    async willTransition(transition) {
        if (this.hasConfirmed) {
            this.hasConfirmed = false;
            return true;
        }

        transition.abort();

        // wait for any existing confirm modal to be closed before allowing transition
        if (this.confirmModal) {
            return;
        }

        const shouldLeave = await this.confirmUnsavedChanges();

        if (shouldLeave) {
            this.hasConfirmed = true;
            return transition.retry();
        }
    }

    async confirmUnsavedChanges() {
        if (this.controller.dirty) {
            this.confirmModal = this.modals
                .open(ConfirmUnsavedChangesModal)
                .finally(() => {
                    this.confirmModal = null;
                });

            return this.confirmModal;
        }

        return true;
    }
}
