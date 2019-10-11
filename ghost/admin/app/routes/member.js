import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {

    router: service(),

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
        this._isMemberUpdated = true;
        return this.store.findRecord('member', params.member_id, {
            reload: true
        });
    },

    setupController(controller, model) {
        this._super(...arguments);
        if (!this._isMemberUpdated) {
            controller.fetchMember.perform(model.get('id'));
        }
    },

    deactivate() {
        this._super(...arguments);

        // clear the properties
        let {controller} = this;
        controller.model.rollbackAttributes();
        this.set('controller.model', null);
        this._isMemberUpdated = false;
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
        if (transition.from && transition.from.name.match(/^member$/) && transition.targetName) {
            let {controller} = this;

            if (!controller.member.isDeleted && controller.member.hasDirtyAttributes) {
                transition.abort();
                controller.send('toggleUnsavedChangesModal', transition);
                return;
            }
        }
    }
});
