import AdminRoute from 'ghost-admin/routes/admin';
import ConfirmUnsavedChangesModal from '../components/modals/confirm-unsaved-changes';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class MembersRoute extends AdminRoute {
    @service feature;
    @service modals;
    @service router;

    _requiresBackgroundRefresh = true;
    fromAnalytics = null;

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
            // Sadly transition.from.params is not reliable to use (not populated on transitions)
            const oldParams = transition.router?.oldState?.params['posts.analytics'] ?? {};

            // We need to store analytics in 'this' to have it accessible for the member route
            this.fromAnalytics = Object.values(oldParams);
            controller.fromAnalytics = this.fromAnalytics;
            controller.directlyFromAnalytics = true;
        } else if (transition.from?.metadata?.fromAnalytics) {
            // Handle returning from member route
            const fromAnalytics = transition.from?.metadata.fromAnalytics ?? null;
            controller.fromAnalytics = fromAnalytics;
            this.fromAnalytics = fromAnalytics;
        } else if (transition.from?.name === 'members.index' && transition.from?.parent?.name === 'members') {
            const fromAnalytics = transition.from?.parent?.metadata.fromAnalytics ?? null;
            controller.fromAnalytics = fromAnalytics;
            this.fromAnalytics = fromAnalytics;
        } else {
            controller.fromAnalytics = null;
            this.fromAnalytics = null;
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

    buildRouteInfoMetadata() {
        return {
            fromAnalytics: this.fromAnalytics
        };
    }
}
