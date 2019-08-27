import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {isEmpty} from '@ember/utils';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend({

    router: service(),

    controllerName: 'tags.tag',
    templateName: 'tags/tag',

    init() {
        this._super(...arguments);
        this.router.on('routeWillChange', (transition) => {
            this.showUnsavedChangesModal(transition);
        });
    },

    model() {
        return this.store.createRecord('tag');
    },

    // reset the model so that mobile screens react to an empty selectedTag
    deactivate() {
        this._super(...arguments);

        let {controller} = this;
        controller.model.rollbackAttributes();
        controller.set('model', null);
    },

    showUnsavedChangesModal(transition) {
        if (transition.from && transition.from.name.match(/^tags\.new/) && transition.targetName) {
            let {controller} = this;
            let isUnchanged = isEmpty(Object.keys(controller.tag.changedAttributes()));
            if (!controller.tag.isDeleted && !isUnchanged) {
                transition.abort();
                controller.send('toggleUnsavedChangesModal', transition);
                return;
            }
        }
    }

});
