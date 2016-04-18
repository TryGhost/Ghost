import AuthenticatedRoute from 'ghost/routes/authenticated';

export default AuthenticatedRoute.extend({
    titleToken: 'Subscribers',

    // redirect any users who are not owners/admins
    beforeModel() {
        this._super(...arguments);
        return this.get('session.user').then((user) => {
            if (!(user.get('isOwner') || user.get('isAdmin'))) {
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
