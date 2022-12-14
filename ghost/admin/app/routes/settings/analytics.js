import AdminRoute from 'ghost-admin/routes/admin';
import ConfirmUnsavedChangesModal from '../../components/modals/confirm-unsaved-changes';
import RSVP from 'rsvp';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';

export default class AnalyticsSettingsRoute extends AdminRoute {
    @service modals;
    @service settings;

    @inject config;

    model() {
        return RSVP.hash({
            settings: this.settings.reload()
        });
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
            this.settings.rollbackAttributes();
            this.hasConfirmed = true;
            return transition.retry();
        }
    }

    async confirmUnsavedChanges() {
        if (this.settings.hasDirtyAttributes) {
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
    reloadSettings() {
        return this.settings.reload();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Analytics'
        };
    }
}
