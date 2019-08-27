/* eslint-disable camelcase */
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
        return this.store.queryRecord('tag', {slug: params.tag_slug});
    },

    serialize(model) {
        return {tag_slug: model.get('slug')};
    },

    setupController() {
        this._super(...arguments);
    },

    // reset the model so that mobile screens react to an empty selectedTag
    deactivate() {
        this._super(...arguments);
        let {controller} = this;
        controller.model.rollbackAttributes();
        this.set('controller.model', null);
    },

    actions: {
        save() {
            this.controller.send('save');
        }
    },

    showUnsavedChangesModal(transition) {
        if (transition.from && transition.from.name.match(/^tags\.tag/) && transition.targetName) {
            let {controller} = this;

            if (!controller.tag.isDeleted && controller.tag.hasDirtyAttributes) {
                transition.abort();
                controller.send('toggleUnsavedChangesModal', transition);
                return;
            }
        }
    }

});
