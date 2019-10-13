import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend({
    config: service(),

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

    setupController(controller) {
        this._super(...arguments);
        controller.fetchMembers.perform();
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Members'
        };
    }
});
