import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';

const {
    RSVP,
    inject: {service}
} = Ember;

export default AuthenticatedRoute.extend({
    titleToken: 'Subscribers',

    feature: service(),

    // redirect if subscribers is disabled or user isn't owner/admin
    beforeModel() {
        this._super(...arguments);
        let promises = {
            user: this.get('session.user'),
            subscribers: this.get('feature.subscribers')
        };

        return RSVP.hash(promises).then((hash) => {
            let {user, subscribers} = hash;

            if (!subscribers || !(user.get('isOwner') || user.get('isAdmin'))) {
                return this.transitionTo('posts');
            }
        });
    },

    setupController(controller) {
        this._super(...arguments);
        controller.send('loadFirstPage');
    },

    deactivate() {
        this._super(...arguments);
        this.get('store').unloadAll('subscriber');
    },

    actions: {
        incrementTotal() {
            this.get('controller').incrementProperty('total');
        }
    }
});
