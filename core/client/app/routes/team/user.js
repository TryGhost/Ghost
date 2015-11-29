import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'Team - User',

    classNames: ['team-view-user'],

    model: function (params) {
        return this.store.queryRecord('user', {slug: params.user_slug});
    },

    serialize: function (model) {
        return {user_slug: model.get('slug')};
    },

    afterModel: function (user) {
        var self = this;
        return this.get('session.user').then(function (currentUser) {
            var isOwnProfile = user.get('id') === currentUser.get('id'),
                isAuthor = currentUser.get('isAuthor'),
                isEditor = currentUser.get('isEditor');
            if (isAuthor && !isOwnProfile) {
                self.transitionTo('team.user', currentUser);
            } else if (isEditor && !isOwnProfile && !user.get('isAuthor')) {
                self.transitionTo('team');
            }
        });
    },

    deactivate: function () {
        var model = this.modelFor('team.user');

        // we want to revert any unsaved changes on exit
        if (model && model.get('hasDirtyAttributes')) {
            model.rollbackAttributes();
        }

        model.get('errors').clear();

        this._super();
    },

    actions: {
        didTransition: function () {
            this.modelFor('team.user').get('errors').clear();
        },

        save: function () {
            this.get('controller').send('save');
        }
    }
});
