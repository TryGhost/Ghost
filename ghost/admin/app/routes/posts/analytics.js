import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {pluralize} from 'ember-inflector';

export default class Analytics extends AuthenticatedRoute {
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
                'newsletter', 
                'count.conversions', 
                'count.clicks', 
                'sentiment', 
                'count.positive_feedback', 
                'count.negative_feedback'
            ].join(',')
        };

        return this.store.query('post', query)
            .then(records => records.get('firstObject'));
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
