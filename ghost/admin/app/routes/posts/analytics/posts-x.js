import AnalyticsRoute from '../analytics';

export default class PostsXRoute extends AnalyticsRoute {
    renderTemplate() {
        this.render('posts-x', {
            controller: 'posts/analytics/posts-x',
            into: 'application'
        });
    }
}
