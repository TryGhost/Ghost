import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';

var SettingsUserRoute = AuthenticatedRoute.extend(styleBody, {
    titleToken: 'User',

    classNames: ['settings-view-user'],

    model: function (params) {
        return this.store.find('user', {slug: params.slug}).then(function (result) {
            if (result && result.content && result.content.length > 0) {
                return result.content[0];
            }
        });
    },

    afterModel: function (user) {
        var self = this;
        this.store.find('user', 'me').then(function (currentUser) {
            var isOwnProfile = user.get('id') === currentUser.get('id'),
                isAuthor = currentUser.get('isAuthor'),
                isEditor = currentUser.get('isEditor');
            if (isAuthor && !isOwnProfile) {
                self.transitionTo('settings.users.user', currentUser);
            } else if (isEditor && !isOwnProfile && !user.get('isAuthor')) {
                self.transitionTo('settings.users');
            }
        });
    },

    deactivate: function () {
        var model = this.modelFor('settings.users.user');

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

export default SettingsUserRoute;
