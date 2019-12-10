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
        if (transition.from && transition.from.name === this.routeName && transition.targetName) {
            let {controller} = this;

            // tag.changedAttributes is always true for new tags but number of changed attrs is reliable
            if (!controller.tag.isDeleted && Object.keys(controller.tag.changedAttributes()).length > 0) {
                transition.abort();
                controller.send('toggleUnsavedChangesModal', transition);
                return;
            }
        }
    }
});
