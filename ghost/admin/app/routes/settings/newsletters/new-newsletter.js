import AdminRoute from 'ghost-admin/routes/admin';
import MultipleNewslettersLimitModal from '../../../components/modals/limits/multiple-newsletters';
import NewNewsletterModal from '../../../components/modals/newsletters/new';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class NewNewsletterRoute extends AdminRoute {
    @service modals;
    @service router;
    @service settings;
    @service store;
    @service limit;

    newsletterModal = null;

    /**
     * Before we allow the creation of a new newsletter, we should check the limits and return to the newsletters page if required.
     */
    async beforeModel() {
        try {
            await this.limit.limiter.errorIfWouldGoOverLimit('newsletters');
        } catch (error) {
            if (error.errorType === 'HostLimitError') {
                // Not allowed: we reached the limit here
                this.modals.open(MultipleNewslettersLimitModal, {
                    message: error.message
                });
                return this.replaceWith('settings.newsletters');
            }

            throw error;
        }
    }

    model() {
        return this.store.createRecord('newsletter');
    }

    setupController(controller, model) {
        this.newsletterModal?.close();

        this.newsletterModal = this.modals.open(NewNewsletterModal, {
            newsletter: model,
            afterSave: this.afterSave
        }, {
            beforeClose: this.beforeModalClose
        });
    }

    @action
    afterSave() {
        this.router.transitionTo('settings.newsletters');
    }

    deactivate() {
        this.isLeaving = true;
        this.newsletterModal?.close();
        this.isLeaving = false;
    }

    @action
    async beforeModalClose() {
        if (!this.isLeaving) {
            this.router.transitionTo('settings.newsletters');
        }
    }
}
