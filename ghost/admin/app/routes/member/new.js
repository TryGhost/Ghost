import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';
import {isEmpty} from '@ember/utils';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(CurrentUserSettings, {

    router: service(),

    controllerName: 'member.new',
    templateName: 'member/new',

    init() {
        this._super(...arguments);
        this.router.on('routeWillChange', (transition) => {
            this.showUnsavedChangesModal(transition);
        });
    },

    model() {
        return this.store.createRecord('member');
    },

    // reset the model so that mobile screens react to an empty selectedMember
    deactivate() {
        this._super(...arguments);

        let {controller} = this;
        controller.model.rollbackAttributes();
        controller.set('model', null);
    },

    showUnsavedChangesModal(transition) {
        if (transition.from && transition.from.name.match(/^members\.new/) && transition.targetName) {
            let {controller} = this;
            let isUnchanged = isEmpty(Object.keys(controller.member.changedAttributes()));
            if (!controller.member.isDeleted && !isUnchanged) {
                transition.abort();
                controller.send('toggleUnsavedChangesModal', transition);
                return;
            }
        }
    }

});
