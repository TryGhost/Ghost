import {test, expect} from '@playwright/test';
import {DataFactory} from '../../data-management/data-factory';

test.describe('Build/Create Pattern', () => {
    let factory: DataFactory;

    test.beforeEach(async () => {
        factory = new DataFactory();
        await factory.initialize();
    });

    test.afterEach(async () => {
        await factory.cleanup();
    });

    test('should build a post without persisting', async () => {
        // Build creates the object but doesn't save it
        const post = factory.ghost.posts.build({
            title: 'Test Build Pattern',
            status: 'draft'
        });

        // Post should have all required fields
        expect(post.id).toBeTruthy();
        expect(post.uuid).toBeTruthy();
        expect(post.title).toBe('Test Build Pattern');
        expect(post.status).toBe('draft');
        expect(post.slug).toContain('test-build-pattern');

        // Post should not be tracked for cleanup (not persisted)
        const stats = factory.ghost.getStats();
        expect(stats.posts).toBe(0);
    });

    test('should create a post and persist it', async () => {
        // Create builds and persists the object
        const post = await factory.ghost.posts.create({
            title: 'Test Create Pattern',
            status: 'published'
        });

        // Post should have all fields
        expect(post.id).toBeTruthy();
        expect(post.title).toBe('Test Create Pattern');
        expect(post.status).toBe('published');

        // Post should be tracked for cleanup
        const stats = factory.ghost.getStats();
        expect(stats.posts).toBe(1);
    });

    test('should build page hits without sending', () => {
        // Build creates the event but doesn't send it
        const hit = factory.tinybird.pageHits.build({
            pathname: '/about',
            referrer: 'https://google.com'
        });

        // Hit should have all required fields
        expect(hit.session_id).toBeTruthy();
        expect(hit.payload.pathname).toBe('/about');
        expect(hit.payload.referrer).toBe('https://google.com');
        expect(hit.payload.meta.referrerSource).toBe('Google');

        // Hit should not be tracked
        const stats = factory.tinybird.getStats();
        expect(stats.sessions).toBe(0);
        expect(stats.events).toBe(0);
    });

    test('should create page hits and send them', async () => {
        // Create builds and sends the event
        const hit = await factory.tinybird.pageHits.create({
            pathname: '/contact',
            member_status: 'free'
        });

        // Hit should have all fields
        expect(hit.session_id).toBeTruthy();
        expect(hit.payload.pathname).toBe('/contact');
        expect(hit.payload.member_status).toBe('free');

        // Hit should be tracked
        const stats = factory.tinybird.getStats();
        expect(stats.sessions).toBe(1);
        expect(stats.events).toBe(1);
    });
});
