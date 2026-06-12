import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {pluralize} from 'ember-inflector';
import {inject as service} from '@ember/service';

export default class Debug extends AuthenticatedRoute {
    @service feature;

    beforeModel(transition) {
        super.beforeModel(...arguments);

        // The React admin owns this screen when the flag is enabled. Hand the
        // URL over to the react-fallback catch-all so this route doesn't load
        // data in the hidden Ember app.
        if (this.feature.postDebugX) {
            const postId = transition.to?.params?.post_id;
            return this.replaceWith('react-fallback', `posts/analytics/${postId}/debug`);
        }
    }

    model(params) {
        let {post_id: id} = params;

        let query = {
            id,
            include: [
                'tags',
                'authors',
                'authors.roles',
                'email',
                'tiers',
                'newsletter'
            ].join(',')
        };

        return this.store.query('post', query)
            .then((records) => {
                return records.get('firstObject');
            });
    }

    // the API will return a post even if the logged in user doesn't have
    // permission to edit it (all posts are public) so we need to do our
    // own permissions check and redirect if necessary
    afterModel(post) {
        super.afterModel(...arguments);

        const user = this.session.user;
        const returnRoute = pluralize(post.constructor.modelName);

        if (user.isAuthorOrContributor && !post.isAuthoredByUser(user)) {
            return this.replaceWith(returnRoute);
        }

        // If the post is not a draft and user is contributor, redirect to index
        if (user.isContributor && !post.isDraft) {
            return this.replaceWith(returnRoute);
        }
    }

    serialize(model) {
        return {
            post_id: model.id
        };
    }
}
