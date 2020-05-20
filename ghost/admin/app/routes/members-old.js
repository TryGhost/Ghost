import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend({
    config: service(),

    queryParams: {
        label: {refreshModel: true}
    },

    // redirect to posts screen if:
    // - TODO: members is disabled?
    // - logged in user isn't owner/admin
    beforeModel() {
        this._super(...arguments);

        return this.session.user.then((user) => {
            if (!user.isOwnerOrAdmin) {
                return this.transitionTo('home');
            }
        });
    },

    // trigger a background load of labels for filter dropdown
    setupController(controller) {
        this._super(...arguments);
        controller.fetchMembers.perform();
        if (!controller._hasLoadedLabels) {
            this.store.query('label', {limit: 'all'}).then(() => {
                controller._hasLoadedLabels = true;
            });
        }
    },

    deactivate() {
        this._super(...arguments);
        this.controller.modalLabel && this.controller.modalLabel.rollbackAttributes();
    },
    buildRouteInfoMetadata() {
        return {
            titleToken: 'Members'
        };
    }

});
