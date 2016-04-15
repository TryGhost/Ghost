import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import PaginationRoute from 'ghost/mixins/pagination-route';

const {computed} = Ember;

export default AuthenticatedRoute.extend(PaginationRoute, {
    titleToken: 'Subscribers',

    paginationModel: 'subscriber',
    paginationSettings: {
        limit: 30
    },

    // redirect any users who are not owners/admins
    beforeModel() {
        this._super(...arguments);
        return this.get('session.user').then((user) => {
            if (!(user.get('isOwner') || user.get('isAdmin'))) {
                return this.transitionTo('posts');
            }
        });
    },

    model() {
        return this.loadFirstPage();
    },

    // TODO: there should be a better way to pass route properties to the controller
    isLoading: computed({
        get() {
            return this._isLoading;
        },
        set(key, value) {
            this._isLoading = value;
            this.set('controller.isLoading', value);
            return value;
        }
    })
});
