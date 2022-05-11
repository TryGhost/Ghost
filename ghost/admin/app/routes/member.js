import AdminRoute from 'ghost-admin/routes/admin';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

export default class MembersRoute extends AdminRoute {
    @service feature;
    @service router;

    _requiresBackgroundRefresh = true;

    constructor() {
        super(...arguments);
        this.router.on('routeWillChange', (transition) => {
            this.showUnsavedChangesModal(transition);
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
            // `member` is passed directly in `<LinkTo>` so it can be a proxy
            // object used by the sparse list requiring the use of .get()
            controller.fetchMemberTask.perform(member.get('id'));
        }
    }

    deactivate() {
        super.deactivate(...arguments);
        // clean up newly created records and revert unsaved changes to existing
        this.controller.member.rollbackAttributes();
        this._requiresBackgroundRefresh = true;
    }

    @action
    save() {
        this.controller.save();
    }

    titleToken() {
        return this.controller.member.name;
    }

    showUnsavedChangesModal(transition) {
        if (transition.from && transition.from.name === this.routeName && transition.targetName) {
            let {controller} = this;

            // member.changedAttributes is always true for new members but number of changed attrs is reliable
            let isChanged = Object.keys(controller.member.changedAttributes()).length > 0;

            if (!controller.member.isDeleted && isChanged) {
                transition.abort();
                controller.toggleUnsavedChangesModal(transition);
                return;
            }
        }
    }
}
