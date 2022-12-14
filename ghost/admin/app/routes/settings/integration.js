import AdminRoute from 'ghost-admin/routes/admin';
import ConfirmUnsavedChangesModal from '../../components/modals/confirm-unsaved-changes';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class IntegrationRoute extends AdminRoute {
    @service modals;
    @service router;

    model(params, transition) {
        // use the integrations controller to fetch all integrations and pick
        // out the one we want. Allows navigation back to integrations screen
        // without a loading state
        return this
            .controllerFor('settings.integrations')
            .integrationModelHook('id', params.integration_id, this, transition);
    }

    resetController(controller) {
        controller.regeneratedApiKey = null;
    }

    deactivate() {
        this.confirmModal = null;
        this.hasConfirmed = false;
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
            this.controller.model.rollbackAttributes();
            this.hasConfirmed = true;
            return transition.retry();
        }
    }

    async confirmUnsavedChanges() {
        if (this.controller.model?.hasDirtyAttributes) {
            this.confirmModal = this.modals
                .open(ConfirmUnsavedChangesModal)
                .finally(() => {
                    this.confirmModal = null;
                });

            return this.confirmModal;
        }

        return true;
    }

    @action
    save() {
        this.controller.send('save');
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Integrations'
        };
    }
}
