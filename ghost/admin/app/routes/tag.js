import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class TagRoute extends AuthenticatedRoute {
    @service router;
    @service session;

    // ensures if a tag model is passed in directly we show it immediately
    // and refresh in the background
    _requiresBackgroundRefresh = true;

    constructor() {
        super(...arguments);

        this.router.on('routeWillChange', (transition) => {
            this.showUnsavedChangesModal(transition);
        });
    }

    beforeModel() {
        super.beforeModel(...arguments);

        if (this.session.user.isAuthorOrContributor) {
            return this.transitionTo('home');
        }
    }

    model(params) {
        this._requiresBackgroundRefresh = false;

        if (params.tag_slug) {
            return this.store.queryRecord('tag', {slug: params.tag_slug});
        } else {
            return this.store.createRecord('tag');
        }
    }

    serialize(tag) {
        return {tag_slug: tag.get('slug')};
    }

    setupController(controller, tag) {
        super.setupController(...arguments);

        if (this._requiresBackgroundRefresh) {
            tag.reload();
        }
    }

    deactivate() {
        super.deactivate(...arguments);

        // clean up newly created records and revert unsaved changes to existing
        this.controller.tag.rollbackAttributes();

        this._requiresBackgroundRefresh = true;
    }

    showUnsavedChangesModal(transition) {
        if (transition.from && transition.from.name === this.routeName && transition.targetName) {
            let {controller} = this;

            // tag.changedAttributes is always true for new tags but number of changed attrs is reliable
            let isChanged = Object.keys(controller.tag.changedAttributes()).length > 0;

            if (!controller.tag.isDeleted && isChanged) {
                transition.abort();
                controller.toggleUnsavedChangesModal(transition);
                return;
            }
        }
    }
}
