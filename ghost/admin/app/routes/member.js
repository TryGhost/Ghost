import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default AuthenticatedRoute.extend({
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
        this._isMemberUpdated = false;
    },

    titleToken() {
        return this.controller.get('member.name');
    }
});
