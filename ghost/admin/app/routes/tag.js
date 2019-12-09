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
        if (params.tag_slug) {
            return this.store.queryRecord('tag', {slug: params.tag_slug});
        } else {
            return this.store.createRecord('tag');
        }
    },

    serialize(model) {
        return {tag_slug: model.get('slug')};
    },

    actions: {
        save() {
            this.controller.send('save');
        }
    },

    showUnsavedChangesModal(transition) {
        if (transition.from && transition.from.name.match(/^tag$|^tag\.new$/) && transition.targetName) {
            let {controller} = this;

            if (!controller.tag.isDeleted && controller.tag.hasDirtyAttributes) {
                transition.abort();
                controller.send('toggleUnsavedChangesModal', transition);
                return;
            }
        }
    }

});
