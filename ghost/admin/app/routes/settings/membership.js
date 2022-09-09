import AdminRoute from 'ghost-admin/routes/admin';
import ConfirmUnsavedChangesModal from '../../components/modals/confirm-unsaved-changes';
import VerifyEmail from '../../components/modals/settings/verify-email';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class MembershipSettingsRoute extends AdminRoute {
    @service notifications;
    @service settings;
    @service modals;

    queryParams = {
        verifyEmail: {
            replace: true
        }
    };

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // @todo: remove in the future, but keep it for now because we might still have some old verification urls in emails
        if (transition.to.queryParams?.supportAddressUpdate === 'success') {
            this.notifications.showAlert(
                `Support email address has been updated`,
                {type: 'success', key: 'members.settings.support-address.updated'}
            );
        }
    }

    model() {
        this.settings.reload();
    }

    afterModel(model, transition) {
        if (transition.to.queryParams.verifyEmail) {
            this.modals.open(VerifyEmail, {
                token: transition.to.queryParams.verifyEmail
            });

            // clear query param so it doesn't linger and cause problems re-entering route
            transition.abort();
            return this.transitionTo('settings.membership', {queryParams: {verifyEmail: null}});
        }
    }

    @action
    async willTransition(transition) {
        if (this.hasConfirmed) {
            return true;
        }

        transition.abort();

        // wait for any existing confirm modal to be closed before allowing transition
        if (this.confirmModal) {
            return;
        }

        if (this.controller.saveTask?.isRunning) {
            await this.controller.saveTask.last;
        }

        const shouldLeave = await this.confirmUnsavedChanges();

        if (shouldLeave) {
            this.controller.reset();

            this.hasConfirmed = true;
            return transition.retry();
        }
    }

    async confirmUnsavedChanges() {
        if (this.controller.isDirty) {
            this.confirmModal = this.modals
                .open(ConfirmUnsavedChangesModal)
                .finally(() => {
                    this.confirmModal = null;
                });

            return this.confirmModal;
        }

        return true;
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Membership'
        };
    }

    resetController(controller, isExiting) {
        if (isExiting) {
            controller.reset();
        }
    }
}
