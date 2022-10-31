import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import ConfirmUnsavedChangesModal from '../../../components/modals/confirm-unsaved-changes';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class UserRoute extends AuthenticatedRoute {
    @service modals;

    model(params) {
        return this.store.queryRecord('user', {slug: params.user_slug, include: 'count.posts'});
    }

    afterModel(user) {
        super.afterModel(...arguments);

        const currentUser = this.session.user;

        let isOwnProfile = user.id === currentUser.id;
        let isAuthorOrContributor = currentUser.isAuthorOrContributor;
        let isEditor = currentUser.isEditor;

        if (isAuthorOrContributor && !isOwnProfile) {
            this.transitionTo('settings.staff.user', currentUser);
        } else if (isEditor && !isOwnProfile && !user.isAuthorOrContributor) {
            this.transitionTo('settings.staff');
        }

        if (isOwnProfile) {
            this.store.queryRecord('api-key', {id: 'me'}).then((apiKey) => {
                this.controller.personalToken = apiKey.id + ':' + apiKey.secret;
                this.controller.personalTokenRegenerated = false;
            });
        }
    }

    serialize(model) {
        return {user_slug: model.get('slug')};
    }

    setupController(controller, model) {
        controller.model = model;
        controller.reset();
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
            this.controller.reset();
            this.hasConfirmed = true;
            return transition.retry();
        }
    }

    async confirmUnsavedChanges() {
        if (this.controller.model.hasDirtyAttributes || this.controller.dirtyAttributes) {
            this.confirmModal = this.modals
                .open(ConfirmUnsavedChangesModal)
                .finally(() => {
                    this.confirmModal = null;
                });

            return this.confirmModal;
        }

        return true;
    }

    deactivate() {
        this.confirmModal = null;
        this.hasConfirmed = false;
        this.controller.reset();
    }

    @action
    didTransition() {
        this.modelFor('settings.staff.user').get('errors').clear();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Staff - User'
        };
    }
}
