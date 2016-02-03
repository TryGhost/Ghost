/* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';
import NotFoundHandler from 'ghost/mixins/404-handler';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, NotFoundHandler, {
    titleToken: 'Team - User',

    classNames: ['team-view-user'],

    model(params) {
        return this.store.queryRecord('user', {slug: params.user_slug, include: 'count.posts'});
    },

    serialize(model) {
        return {user_slug: model.get('slug')};
    },

    afterModel(user) {
        this._super(...arguments);

        return this.get('session.user').then((currentUser) => {
            let isOwnProfile = user.get('id') === currentUser.get('id');
            let isAuthor = currentUser.get('isAuthor');
            let isEditor = currentUser.get('isEditor');

            if (isAuthor && !isOwnProfile) {
                this.transitionTo('team.user', currentUser);
            } else if (isEditor && !isOwnProfile && !user.get('isAuthor')) {
                this.transitionTo('team');
            }
        });
    },

    deactivate() {
        let model = this.modelFor('team.user');

        // we want to revert any unsaved changes on exit
        if (model && model.get('hasDirtyAttributes')) {
            model.rollbackAttributes();
        }

        model.get('errors').clear();

        this._super(...arguments);
    },

    actions: {
        didTransition() {
            this.modelFor('team.user').get('errors').clear();
        },

        save() {
            this.get('controller').send('save');
        }
    }
});
