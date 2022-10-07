import AdminRoute from 'ghost-admin/routes/admin';
import ConfirmUnsavedChangesModal from '../components/modals/confirm-unsaved-changes';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class MembersRoute extends AdminRoute {
    @service feature;
    @service modals;
    @service router;

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

    setupController(controller, member) {
        super.setupController(...arguments);
        if (this._requiresBackgroundRefresh) {
            controller.fetchMemberTask.perform(member.id);
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
            this.confirmModal = this.modals
                .open(ConfirmUnsavedChangesModal)
                .finally(() => {
                    this.confirmModal = null;
                });

            return this.confirmModal;
        }

        return true;
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
