import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';

@classic
export default class MembersRoute extends AuthenticatedRoute {
    @service router;

    _requiresBackgroundRefresh = true;

    init() {
        super.init(...arguments);
        this.router.on('routeWillChange', (transition) => {
            this.showUnsavedChangesModal(transition);
        });
    }

    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.session.user.isOwnerOrAdmin) {
            return this.transitionTo('home');
        }
    }

    model(params) {
        this._requiresBackgroundRefresh = false;

        if (params.member_id) {
            return this.store.queryRecord('member', {id: params.member_id, include: 'email_recipients,products'});
        } else {
            return this.store.createRecord('member');
        }
    }

    setupController(controller, member) {
        super.setupController(...arguments);
        if (this._requiresBackgroundRefresh) {
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
