import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend({
    session: service(),
    settings: service(),

    beforeModel() {
        this._super(...arguments);
        return this.session.get('user').then((user) => {
            if (!user.isOwner && user.isAdmin) {
                return this.transitionTo('settings');
            } else if (!user.isOwner) {
                return this.transitionTo('home');
            }
        });
    },

    model() {
        return this.settings.reload();
    },

    resetController(controller, isExiting) {
        if (isExiting) {
            controller.reset();
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Members'
        };
    }
});
