import AnalyticsRoute from '../analytics';

export default class NewsletterStatsRoute extends AnalyticsRoute {
    renderTemplate() {
        this.render('posts-x', {
            controller: 'posts/analytics/posts-x',
            into: 'application'
        });
    }
}
