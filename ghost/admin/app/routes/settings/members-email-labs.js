import AdminRoute from 'ghost-admin/routes/admin';
import ConfirmUnsavedChangesModal from '../../components/modals/confirm-unsaved-changes';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class MembersEmailLabsRoute extends AdminRoute {
    @service feature;
    @service modals;
    @service notifications;
    @service settings;

    confirmModal = null;
    hasConfirmed = false;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        if (!this.feature.multipleNewsletters) {
            return this.transitionTo('settings.members-email');
        }

        if (transition.to.queryParams?.fromAddressUpdate === 'success') {
            this.notifications.showAlert(
                `Newsletter email address has been updated`,
                {type: 'success', key: 'members.settings.from-address.updated'}
            );
        }
    }

    model() {
        return this.settings.reload();
    }

    setupController(controller) {
        controller.resetEmailAddresses();
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
        this.confirmModal = null;
        this.hasConfirmed = false;
    }

    confirmUnsavedChanges() {
        if (!this.settings.get('hasDirtyAttributes')) {
            return Promise.resolve(true);
        }

        if (!this.confirmModal) {
            this.confirmModal = this.modals.open(ConfirmUnsavedChangesModal)
                .then((discardChanges) => {
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

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Email newsletter'
        };
    }
}
