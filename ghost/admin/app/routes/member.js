import * as Sentry from '@sentry/ember';
import ConfirmUnsavedChangesModal from '../components/modals/confirm-unsaved-changes';
import MembersManagementRoute from './members-management';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class MembersRoute extends MembersManagementRoute {
    @service feature;
    @service modals;
    @service router;

    queryParams = {
        postAnalytics: {refreshModel: false}
    };

    _requiresBackgroundRefresh = true;

    constructor() {
        super(...arguments);
        this.router.on('routeWillChange', (transition) => {
            this.closeImpersonateModal(transition);
        });
    }

    model(params) {
        this._requiresBackgroundRefresh = false;

        if (params.member_id) {
            return this.store.queryRecord('member', {id: params.member_id, include: 'tiers'});
        } else {
            return this.store.createRecord('member');
        }
    }

    setupController(controller, member, transition) {
        super.setupController(...arguments);

        controller.setInitialRelationshipValues();

        if (this._requiresBackgroundRefresh) {
            controller.fetchMemberTask.perform(member.id);
        }

        controller.directlyFromAnalytics = false;
        if (transition.from?.name === 'posts.analytics') {
            controller.directlyFromAnalytics = true;
        }
    }

    resetController(controller, isExiting) {
        super.resetController(...arguments);

        // Make sure we clear
        if (isExiting && controller.postAnalytics) {
            controller.set('postAnalytics', null);
            controller.set('directlyFromAnalytics', false);
        }
    }

    deactivate() {
        this._requiresBackgroundRefresh = true;

        this.confirmModal = null;
        this.hasConfirmed = false;
    }

    @action
    save() {
        this.controller.save();
    }

    @action
    async willTransition(transition) {
        let hasDirtyAttributes = this.controller.dirtyAttributes;

        // wait for any existing confirm modal to be closed before allowing transition
        if (this.confirmModal) {
            return;
        }

        if (!this.hasConfirmed && hasDirtyAttributes) {
            transition.abort();

            if (this.controller.saveTask?.isRunning) {
                await this.controller.saveTask.last;
                transition.retry();
            }

            const shouldLeave = await this.confirmUnsavedChanges();

            if (shouldLeave) {
                this.controller.model.rollbackAttributes();
                this.hasConfirmed = true;
                return transition.retry();
            }
        }
    }

    async confirmUnsavedChanges() {
        Sentry.captureMessage('showing unsaved changes modal for members route');
        this.confirmModal = this.modals
            .open(ConfirmUnsavedChangesModal)
            .finally(() => {
                this.confirmModal = null;
            });

        return this.confirmModal;
    }

    closeImpersonateModal(transition) {
        // If user navigates away with forward or back button, ensure returning to page
        // hides modal
        if (transition.from && transition.from.name === this.routeName && transition.targetName) {
            let {controller} = this;

            controller.closeImpersonateMemberModal(transition);
        }
    }

    titleToken() {
        return this.controller.member.name;
    }
}
