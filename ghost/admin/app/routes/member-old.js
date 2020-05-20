import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    router: service(),

    _requiresBackgroundRefresh: true,

    init() {
        this._super(...arguments);
        this.router.on('routeWillChange', (transition) => {
            this.showUnsavedChangesModal(transition);
        });
    },

    beforeModel() {
        this._super(...arguments);
        return this.get('session.user')
            .then(this.transitionAuthor());
    },

    model(params) {
        this._requiresBackgroundRefresh = false;

        if (params.member_id) {
            return this.store.findRecord('member', params.member_id, {reload: true});
        } else {
            return this.store.createRecord('member');
        }
    },

    setupController(controller, member) {
        this._super(...arguments);
        if (this._requiresBackgroundRefresh) {
            controller.fetchMember.perform(member.get('id'));
        }
    },

    deactivate() {
        this._super(...arguments);

        // clean up newly created records and revert unsaved changes to existing
        this.controller.member.rollbackAttributes();

        this._requiresBackgroundRefresh = true;
    },

    actions: {
        save() {
            this.controller.send('save');
        }
    },

    titleToken() {
        return this.controller.get('member.name');
    },

    showUnsavedChangesModal(transition) {
        if (transition.from && transition.from.name === this.routeName && transition.targetName) {
            let {controller} = this;

            // member.changedAttributes is always true for new members but number of changed attrs is reliable
            let isChanged = Object.keys(controller.member.changedAttributes()).length > 0;

            if (!controller.member.isDeleted && isChanged) {
                transition.abort();
                controller.send('toggleUnsavedChangesModal', transition);
                return;
            }
        }
    }
});
