import AdminRoute from 'ghost-admin/routes/admin';
import CustomIntegrationLimitsModal from '../../../components/modals/limits/custom-integration';
import NewCustomIntegrationModal from '../../../components/modals/new-custom-integration';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class NewIntegrationRoute extends AdminRoute {
    @service limit;
    @service modals;
    @service router;

    modal = null;

    async model() {
        if (this.limit.limiter?.isLimited('customIntegrations')) {
            try {
                await this.limit.limiter.errorIfWouldGoOverLimit('customIntegrations');
            } catch (error) {
                this.modal = this.modals.open(CustomIntegrationLimitsModal, {
                    message: error.message
                }, {
                    beforeClose: this.beforeModalClose
                });
                return;
            }
        }

        this.modal = this.modals.open(NewCustomIntegrationModal, {}, {
            beforeClose: this.beforeModalClose
        });
    }

    deactivate() {
        // ensure we don't try to redirect on modal close if we're already transitioning away
        this.isLeaving = true;
        this.modal?.close();

        this.modal = null;
        this.isLeaving = false;
    }

    @action
    beforeModalClose() {
        if (this.modal && !this.isLeaving) {
            this.router.transitionTo('settings.integrations');
        }
    }
}
