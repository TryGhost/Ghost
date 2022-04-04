import AdminRoute from 'ghost-admin/routes/admin';
import EditNewsletterModal from 'ghost-admin/components/modals/edit-newsletter';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class EditNewsletterRoute extends AdminRoute {
    @service modals;
    @service router;
    @service store;

    newsletterModal = null;

    model(params) {
        return this.store.find('newsletter', params.newsletter_id);
    }

    setupController(controller, model) {
        this.newsletterModal?.close();

        this.newsletterModal = this.modals.open(EditNewsletterModal, {
            newsletter: model,
            afterSave: this.afterSave
        }, {
            beforeClose: this.beforeModalClose
        });
    }

    deactivate() {
        this.isLeaving = true;
        this.newsletterModal?.close();

        this.isLeaving = false;
        this.newsletterModal = null;
    }

    @action
    afterSave() {
        this.router.transitionTo('settings.members-email-labs');
    }

    @action
    beforeModalClose() {
        if (this.newsletterModal && !this.isLeaving) {
            this.router.transitionTo('settings.members-email-labs');
        }
    }
}
