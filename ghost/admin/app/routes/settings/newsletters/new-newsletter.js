import AdminRoute from 'ghost-admin/routes/admin';
import NewNewsletterModal from '../../../components/modals/newsletters/new';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class NewNewsletterRoute extends AdminRoute {
    @service modals;
    @service router;
    @service settings;
    @service store;

    newsletterModal = null;

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
