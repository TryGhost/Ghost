import AdminRoute from 'ghost-admin/routes/admin';
import ConfirmUnsavedChangesModal from '../../components/modals/confirm-unsaved-changes';
import VerifyNewsletterEmail from '../../components/modals/newsletters/verify-newsletter-email';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class MembersEmailLabsRoute extends AdminRoute {
    @service feature;
    @service modals;
    @service notifications;
    @service settings;

    queryParams = {
        verifyEmail: {
            replace: true
        }
    };

    confirmModal = null;
    hasConfirmed = false;

    model() {
        return this.settings.reload();
    }

    afterModel(model, transition) {
        if (transition.to.queryParams.verifyEmail) {
            this.modals.open(VerifyNewsletterEmail, {
                token: transition.to.queryParams.verifyEmail
            });

            // clear query param so it doesn't linger and cause problems re-entering route
            transition.abort();
            return this.transitionTo('settings.newsletters', {queryParams: {verifyEmail: null}});
        }
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
