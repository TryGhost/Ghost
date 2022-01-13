import Route from '@ember/routing/route';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class NewIntegrationRoute extends Route {
    @service limit;
    @service modals;

    modal = null;

    async model() {
        if (this.limit.limiter?.isLimited('customIntegrations')) {
            try {
                await this.limit.limiter.errorIfWouldGoOverLimit('customIntegrations');
            } catch (error) {
                this.modal = this.modals.open('modals/limits/custom-integration', {
                    message: error.message
                }, {
                    beforeClose: this.beforeModalClose
                });
                return;
            }
        }

        this.modal = this.modals.open('modals/new-custom-integration', {}, {
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
        if (!this.isLeaving) {
            this.transitionTo('settings.integrations');
        }
    }
}
