import * as Sentry from '@sentry/ember';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import ConfirmUnsavedChangesModal from '../components/modals/confirm-unsaved-changes';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class CollectionRoute extends AuthenticatedRoute {
    @service modals;
    @service router;
    @service session;

    // ensures if a tag model is passed in directly we show it immediately
    // and refresh in the background
    _requiresBackgroundRefresh = true;

    beforeModel() {
        super.beforeModel(...arguments);

        if (this.session.user.isAuthorOrContributor) {
            return this.transitionTo('home');
        }
    }

    model(params) {
        this._requiresBackgroundRefresh = false;

        if (params.collection_slug) {
            return this.store.queryRecord('collection', {slug: params.collection_slug});
        } else {
            return this.store.createRecord('collection');
        }
    }

    serialize(collection) {
        return {collection_slug: collection.get('slug')};
    }

    setupController(controller, tag) {
        super.setupController(...arguments);

        if (this._requiresBackgroundRefresh) {
            tag.reload();
        }
    }

    deactivate() {
        this._requiresBackgroundRefresh = true;

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
            Sentry.captureMessage('showing unsaved changes modal for collections route');
            this.confirmModal = this.modals
                .open(ConfirmUnsavedChangesModal)
                .finally(() => {
                    this.confirmModal = null;
                });

            return this.confirmModal;
        }

        return true;
    }
}
