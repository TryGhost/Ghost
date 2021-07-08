/* eslint-disable camelcase */
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from 'ghost-admin/mixins/current-user-settings';

export default AuthenticatedRoute.extend(CurrentUserSettings, {
    model(params) {
        return this.store.queryRecord('user', {slug: params.user_slug, include: 'count.posts'});
    },

    afterModel(user) {
        this._super(...arguments);

        const currentUser = this.session.user;

        let isOwnProfile = user.get('id') === currentUser.get('id');
        let isAuthorOrContributor = currentUser.get('isAuthorOrContributor');
        let isEditor = currentUser.get('isEditor');

        if (isAuthorOrContributor && !isOwnProfile) {
            this.transitionTo('staff.user', currentUser);
        } else if (isEditor && !isOwnProfile && !user.get('isAuthorOrContributor')) {
            this.transitionTo('staff');
        }

        if (isOwnProfile) {
            this.store.queryRecord('api-key', {id: 'me'}).then((apiKey) => {
                this.controller.set('personalToken', apiKey.id + ':' + apiKey.secret);
                this.controller.set('personalTokenRegenerated', false);
            });
        }
    },

    serialize(model) {
        return {user_slug: model.get('slug')};
    },

    actions: {
        didTransition() {
            this.modelFor('staff.user').get('errors').clear();
        },

        save() {
            this.get('controller.save').perform();
        },

        willTransition(transition) {
            let controller = this.controller;
            let user = controller.user;
            let dirtyAttributes = controller.dirtyAttributes;
            let modelIsDirty = user.get('hasDirtyAttributes');

            // always reset the password properties on the user model when leaving
            if (user) {
                user.set('password', '');
                user.set('newPassword', '');
                user.set('ne2Password', '');
            }

            if (modelIsDirty || dirtyAttributes) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Staff - User'
        };
    }
});
