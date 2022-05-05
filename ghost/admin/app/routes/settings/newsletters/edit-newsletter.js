import AdminRoute from 'ghost-admin/routes/admin';
import ConfirmUnsavedChangesModal from '../../../components/modals/confirm-unsaved-changes';
import EditNewsletterModal from '../../../components/modals/newsletters/edit';
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

    @action
    afterSave() {
        this.router.transitionTo('settings.newsletters');
    }

    deactivate() {
        this.isLeaving = true;
        this.newsletterModal?.close();

        this.isLeaving = false;
        this.newsletterModal = null;

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

        const shouldLeave = await this.confirmUnsavedChanges();

        if (shouldLeave) {
            this.hasConfirmed = true;
            return transition.retry();
        }
    }

    async confirmUnsavedChanges() {
        const newsletter = this.newsletterModal?._data.newsletter;

        if (newsletter?.hasDirtyAttributes) {
            this.confirmModal = this.modals.open(ConfirmUnsavedChangesModal)
                .then((discardChanges) => {
                    if (discardChanges === true) {
                        newsletter.rollbackAttributes();
                    }
                    return discardChanges;
                }).finally(() => {
                    this.confirmModal = null;
                });

            return this.confirmModal;
        }

        return true;
    }

    @action
    async beforeModalClose() {
        const shouldLeave = await this.confirmUnsavedChanges();

        if (shouldLeave && !this.isLeaving) {
            this.router.transitionTo('settings.newsletters');
            return true;
        }

        return false;
    }
}
