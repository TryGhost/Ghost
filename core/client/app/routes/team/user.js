import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

var TeamUserRoute = AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'Team - User',

    classNames: ['team-view-user'],

    model: function (params) {
        var self = this;
        // TODO: Make custom user adapter that uses /api/users/:slug endpoint
        // return this.store.find('user', { slug: params.slug });

        // Instead, get all the users and then find by slug
        return this.store.find('user').then(function (result) {
            var user = result.findBy('slug', params.slug);

            if (!user) {
                return self.transitionTo('error404', 'team/' + params.slug);
            }

            return user;
        });
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
        if (model && model.get('isDirty')) {
            model.rollback();
        }

        this._super();
    },

    actions: {
        save: function () {
            this.get('controller').send('save');
        }
    }
});

export default TeamUserRoute;
