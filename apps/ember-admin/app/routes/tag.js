import * as Sentry from '@sentry/ember';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import ConfirmUnsavedChangesModal from '../components/modals/confirm-unsaved-changes';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class TagRoute extends AuthenticatedRoute {
    @service modals;
    @service router;
    @service session;
    @service('unsaved-changes') unsavedChanges;

    // ensures if a tag model is passed in directly we show it immediately
    // and refresh in the background
    _requiresBackgroundRefresh = true;
    _unregisterUnsavedChanges = null;

    beforeModel() {
        super.beforeModel(...arguments);

        if (this.session.user.isAuthorOrContributor) {
            return this.transitionTo('home');
        }
    }

    model(params) {
        this._requiresBackgroundRefresh = false;

        if (params.tag_slug) {
            return this.store.queryRecord('tag', {slug: params.tag_slug, include: 'count.posts'});
        } else {
            return this.store.createRecord('tag');
        }
    }

    serialize(tag) {
        return {tag_slug: tag.get('slug')};
    }

    setupController(controller, tag) {
        super.setupController(...arguments);

        if (this._requiresBackgroundRefresh) {
            tag.reload();
        }

        this._registerUnsavedChanges(controller);
    }

    deactivate() {
        this._requiresBackgroundRefresh = true;
        this._unregisterUnsavedChanges?.();
        this._unregisterUnsavedChanges = null;
    }

    @action
    async willTransition(transition) {
        return this.unsavedChanges.guardTransition(transition);
    }

    _registerUnsavedChanges(controller) {
        this._unregisterUnsavedChanges?.();
        this._unregisterUnsavedChanges = this.unsavedChanges.register({
            isDirty: () => controller.model?.hasDirtyAttributes,
            confirmLeave: () => this._confirmUnsavedChanges(controller)
        });
    }

    async _confirmUnsavedChanges(controller) {
        if (controller.saveTask?.isRunning) {
            try {
                await controller.saveTask.last;
            } catch (e) {
                // ignore save errors — we'll check dirty state below
            }
        }

        if (!controller.model?.hasDirtyAttributes) {
            return true;
        }

        Sentry.captureMessage('showing unsaved changes modal for tags route');
        const shouldLeave = await this.modals.open(ConfirmUnsavedChangesModal);

        if (shouldLeave) {
            controller.model.rollbackAttributes();
            return true;
        }

        return false;
    }
}
