/* eslint-disable camelcase */
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend({
    router: service(),
    session: service(),

    _requiresBackgroundRefresh: true,

    init() {
        this._super(...arguments);
        this.router.on('routeWillChange', (transition) => {
            this.showUnsavedChangesModal(transition);
        });
    },

    beforeModel() {
        this._super(...arguments);

        if (this.session.user.isAuthorOrContributor) {
            return this.transitionTo('home');
        }
    },

    model(params) {
        this._requiresBackgroundRefresh = false;

        if (params.tag_slug) {
            return this.store.queryRecord('tag', {slug: params.tag_slug});
        } else {
            return this.store.createRecord('tag');
        }
    },

    serialize(tag) {
        return {tag_slug: tag.get('slug')};
    },

    setupController(controller, tag) {
        this._super(...arguments);
        if (this._requiresBackgroundRefresh) {
            controller.fetchTag.perform(tag.get('slug'));
        }
    },

    deactivate() {
        this._super(...arguments);

        // clean up newly created records and revert unsaved changes to existing
        this.controller.tag.rollbackAttributes();

        this._requiresBackgroundRefresh = true;
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
            let isChanged = Object.keys(controller.tag.changedAttributes()).length > 0;

            if (!controller.tag.isDeleted && isChanged) {
                transition.abort();
                controller.send('toggleUnsavedChangesModal', transition);
                return;
            }
        }
    }
});
