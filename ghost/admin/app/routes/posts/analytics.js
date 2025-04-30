import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject} from 'ghost-admin/decorators/inject';
import {pluralize} from 'ember-inflector';
import {inject as service} from '@ember/service';
export default class Analytics extends AuthenticatedRoute {
    @inject config;
    @service feature;

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

        if (this.routeName === 'posts.analytics.posts-x') {
            // This is based on the logic for the dashboard
            if (this.session.user.isContributor) {
                return this.transitionTo('posts');
            } else if (!this.session.user.isAdmin) {
                return this.transitionTo('site');
            }

            // This ensures that we don't load this page if the stats config is not set
            if (!(this.config.stats && this.feature.trafficAnalytics)) {
                return this.transitionTo('home');
            }
        }
    }

    serialize(model) {
        return {
            post_id: model.id
        };
    }
}
