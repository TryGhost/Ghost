import {action} from '@ember/object';
/* eslint-disable camelcase */
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';

export default class UserRoute extends AuthenticatedRoute {
    model(params) {
        return this.store.queryRecord('user', {slug: params.user_slug, include: 'count.posts'});
    }

    afterModel(user) {
        super.afterModel(...arguments);

        const currentUser = this.session.user;

        let isOwnProfile = user.get('id') === currentUser.get('id');
        let isAuthorOrContributor = currentUser.get('isAuthorOrContributor');
        let isEditor = currentUser.get('isEditor');

        if (isAuthorOrContributor && !isOwnProfile) {
            this.transitionTo('settings.staff.user', currentUser);
        } else if (isEditor && !isOwnProfile && !user.get('isAuthorOrContributor')) {
            this.transitionTo('settings.staff');
        }

        if (isOwnProfile) {
            this.store.queryRecord('api-key', {id: 'me'}).then((apiKey) => {
                this.controller.set('personalToken', apiKey.id + ':' + apiKey.secret);
                this.controller.set('personalTokenRegenerated', false);
            });
        }
    }

    serialize(model) {
        return {user_slug: model.get('slug')};
    }

    @action
    didTransition() {
        this.modelFor('settings.staff.user').get('errors').clear();
    }

    @action
    save() {
        this.controller.save.perform();
    }

    @action
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

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Staff - User'
        };
    }
}
