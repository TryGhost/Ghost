import {buildCrossAppPostsRoute, POSTS_ANALYTICS_ROUTES, STATS_ROUTES} from '../../../src/utils/app-routes';

describe('app-routes', () => {
    describe('buildCrossAppPostsRoute', () => {
        it('should prepend /posts to the given route', () => {
            expect(buildCrossAppPostsRoute('/analytics/123')).toBe('/posts/analytics/123');
            expect(buildCrossAppPostsRoute('/analytics/123/web')).toBe('/posts/analytics/123/web');
            expect(buildCrossAppPostsRoute('/analytics/123/newsletter')).toBe('/posts/analytics/123/newsletter');
            expect(buildCrossAppPostsRoute('/analytics/123/growth')).toBe('/posts/analytics/123/growth');
        });

        it('should handle routes without leading slash', () => {
            expect(buildCrossAppPostsRoute('analytics/123')).toBe('/posts/analytics/123');
        });

        it('should handle empty string', () => {
            expect(buildCrossAppPostsRoute('')).toBe('/posts/');
        });
    });

    describe('POSTS_ANALYTICS_ROUTES', () => {
        it('should generate correct routes for post analytics', () => {
            const postId = 'test-post-123';
            
            expect(POSTS_ANALYTICS_ROUTES.OVERVIEW(postId)).toBe('/analytics/test-post-123');
            expect(POSTS_ANALYTICS_ROUTES.WEB(postId)).toBe('/analytics/test-post-123/web');
            expect(POSTS_ANALYTICS_ROUTES.NEWSLETTER(postId)).toBe('/analytics/test-post-123/newsletter');
            expect(POSTS_ANALYTICS_ROUTES.GROWTH(postId)).toBe('/analytics/test-post-123/growth');
        });

        it('should handle special characters in post ID', () => {
            const postId = 'post-with-special-chars-@#$';
            
            expect(POSTS_ANALYTICS_ROUTES.OVERVIEW(postId)).toBe('/analytics/post-with-special-chars-@#$');
        });
    });

    describe('STATS_ROUTES', () => {
        it('should have correct static routes', () => {
            expect(STATS_ROUTES.OVERVIEW).toBe('/analytics');
            expect(STATS_ROUTES.WEB).toBe('/analytics/web/');
            expect(STATS_ROUTES.LOCATIONS).toBe('/analytics/locations/');
            expect(STATS_ROUTES.GROWTH).toBe('/analytics/growth/');
            expect(STATS_ROUTES.NEWSLETTERS).toBe('/analytics/newsletters/');
        });
    });

    describe('integration with buildCrossAppPostsRoute', () => {
        it('should correctly build cross-app routes for posts analytics', () => {
            const postId = 'test-post-456';
            
            const overviewRoute = buildCrossAppPostsRoute(POSTS_ANALYTICS_ROUTES.OVERVIEW(postId));
            expect(overviewRoute).toBe('/posts/analytics/test-post-456');
            
            const webRoute = buildCrossAppPostsRoute(POSTS_ANALYTICS_ROUTES.WEB(postId));
            expect(webRoute).toBe('/posts/analytics/test-post-456/web');
            
            const newsletterRoute = buildCrossAppPostsRoute(POSTS_ANALYTICS_ROUTES.NEWSLETTER(postId));
            expect(newsletterRoute).toBe('/posts/analytics/test-post-456/newsletter');
            
            const growthRoute = buildCrossAppPostsRoute(POSTS_ANALYTICS_ROUTES.GROWTH(postId));
            expect(growthRoute).toBe('/posts/analytics/test-post-456/growth');
        });
    });
});