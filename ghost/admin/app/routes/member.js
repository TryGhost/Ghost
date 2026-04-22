import * as Sentry from '@sentry/ember';
import ConfirmUnsavedChangesModal from '../components/modals/confirm-unsaved-changes';
import MembersManagementRoute from './members-management';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class MembersRoute extends MembersManagementRoute {
    @service feature;
    @service modals;
    @service router;
    @service('unsaved-changes') unsavedChanges;

    queryParams = {
        postAnalytics: {refreshModel: false}
    };

    _requiresBackgroundRefresh = true;
    _unregisterUnsavedChanges = null;

    constructor() {
        super(...arguments);
        this.router.on('routeWillChange', (transition) => {
            this.closeImpersonateModal(transition);
        });
    }

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // The outer React shell owns sibling URLs like /members/import.
        // Ember's recognizer can still match this dynamic route for those
        // paths and fire a bogus queryRecord that surfaces as an alert.
        // Abort the transition for known React-owned siblings so the React
        // shell keeps rendering the page.
        const memberId = transition.to?.params?.member_id;
        if (memberId === 'import') {
            transition.abort();
        }
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
        if (transition.from?.params?.path?.startsWith('posts/analytics')) {
            controller.directlyFromAnalytics = true;
        }

        this._registerUnsavedChanges(controller);
    }

    resetController(controller, isExiting) {
        super.resetController(...arguments);

        // Make sure we clear
        if (isExiting) {
            controller.set('backPath', null);
            controller.set('directlyFromAnalytics', false);
        }

        if (isExiting && controller.postAnalytics) {
            controller.set('postAnalytics', null);
        }
    }

    deactivate() {
        this._requiresBackgroundRefresh = true;
        this._unregisterUnsavedChanges?.();
        this._unregisterUnsavedChanges = null;
    }

    @action
    save() {
        this.controller.save();
    }

    @action
    async willTransition(transition) {
        return this.unsavedChanges.guardTransition(transition);
    }

    closeImpersonateModal(transition) {
        // If user navigates away with forward or back button, ensure returning to page
        // hides modal
        if (transition.from && transition.from.name === this.routeName && transition.targetName) {
            let {controller} = this;

            controller.closeImpersonateMemberModal(transition);
        }
    }

    _registerUnsavedChanges(controller) {
        this._unregisterUnsavedChanges?.();
        this._unregisterUnsavedChanges = this.unsavedChanges.register({
            isDirty: () => controller.dirtyAttributes,
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

        if (!controller.dirtyAttributes) {
            return true;
        }

        Sentry.captureMessage('showing unsaved changes modal for members route');
        const shouldLeave = await this.modals.open(ConfirmUnsavedChangesModal);

        if (shouldLeave) {
            controller.model.rollbackAttributes();
            return true;
        }

        return false;
    }

    titleToken() {
        return this.controller.member.name;
    }
}
