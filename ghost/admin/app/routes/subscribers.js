import RSVP from 'rsvp';
import injectService from 'ember-service/inject';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default AuthenticatedRoute.extend({
    titleToken: 'Subscribers',

    feature: injectService(),

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
        controller.initializeTable();
        controller.send('loadFirstPage');
    },

    resetController(controller, isExiting) {
        this._super(...arguments);
        if (isExiting) {
            controller.set('order', 'created_at');
            controller.set('direction', 'desc');
        }
    },

    actions: {
        addSubscriber(subscriber) {
            this.get('controller').send('addSubscriber', subscriber);
        },

        reset() {
            this.get('controller').send('reset');
        }
    }
});
