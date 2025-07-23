import {test, expect} from '../../test-fixtures';

test.describe('Tinybird Plugin', () => {
    test('should create a page hit with defaults', async ({tinybird}) => {
        const hit = await tinybird.createPageHit();
        
        expect(hit.timestamp).toBeTruthy();
        expect(hit.action).toBe('page_hit');
        expect(hit.version).toBe('1');
        expect(hit.session_id).toBeTruthy();
        expect(hit.payload.site_uuid).toBeTruthy();
        expect(hit.payload.pathname).toBe('/');
        expect(hit.payload.member_status).toBe('undefined');
        expect(hit.payload['user-agent']).toBeTruthy();
        expect(hit.payload.event_id).toBeTruthy();
    });
    
    test('should create page hit with custom options', async ({tinybird, ghost}) => {
        const post = await ghost.createPost();
        
        const hit = await tinybird.createPageHit({
            post_uuid: post.uuid,
            pathname: `/posts/${post.slug}`,
            member_status: 'paid',
            referrer: 'https://google.com',
            locale: 'fr-FR',
            location: 'FR'
        });
        
        expect(hit.payload.post_uuid).toBe(post.uuid);
        expect(hit.payload.pathname).toBe(`/posts/${post.slug}`);
        expect(hit.payload.member_status).toBe('paid');
        expect(hit.payload.referrer).toBe('https://google.com');
        expect(hit.payload.locale).toBe('fr-FR');
        expect(hit.payload.location).toBe('FR');
        expect(hit.payload.meta.referrerSource).toBe('Google');
    });
    
    test('should parse referrer sources correctly', async ({tinybird}) => {
        const testCases = [
            {referrer: 'https://google.com/search', expected: 'Google'},
            {referrer: 'https://news.google.com', expected: 'Google News'},
            {referrer: 'https://duckduckgo.com', expected: 'DuckDuckGo'},
            {referrer: 'https://bing.com', expected: 'Bing'},
            {referrer: 'https://reddit.com/r/ghost', expected: 'Reddit'},
            {referrer: 'https://go.bsky.app', expected: 'Bluesky'},
            {referrer: 'https://t.co/abc123', expected: 'Twitter'},
            {referrer: 'https://facebook.com', expected: 'Facebook'},
            {referrer: 'https://example.com', expected: 'example.com'}
        ];
        
        for (const {referrer, expected} of testCases) {
            const hit = await tinybird.createPageHit({referrer});
            expect(hit.payload.meta.referrerSource).toBe(expected);
        }
    });
    
    test('should create multiple page hits', async ({tinybird, ghost}) => {
        const post = await ghost.createPost();
        const hits = await tinybird.createPageHits(5, {
            post_uuid: post.uuid
        });
        
        expect(hits).toHaveLength(5);
        hits.forEach((hit) => {
            expect(hit.payload.post_uuid).toBe(post.uuid);
        });
    });
    
    test('should create page hits for a specific post', async ({tinybird, ghost}) => {
        const post = await ghost.createPublishedPost();
        const hits = await tinybird.createPageHitsForPost(post.uuid, 10, {
            member_status: 'free'
        });
        
        expect(hits).toHaveLength(10);
        hits.forEach((hit) => {
            expect(hit.payload.post_uuid).toBe(post.uuid);
            expect(hit.payload.member_status).toBe('free');
        });
    });
    
    test('should manage sessions correctly', async ({tinybird}) => {
        // Create new session
        const session1 = tinybird.createNewSession();
        expect(session1).toBeTruthy();
        expect(typeof session1).toBe('string');
        
        // Create another session
        const session2 = tinybird.createNewSession();
        expect(session2).not.toBe(session1);
        
        // Create hits with specific session
        const hits = await tinybird.createSessionHits(session1, 3, {
            pathname: '/about'
        });
        
        expect(hits).toHaveLength(3);
        hits.forEach((hit) => {
            expect(hit.session_id).toBe(session1);
            expect(hit.payload.pathname).toBe('/about');
        });
    });
    
    test('should track sessions for cleanup', async ({tinybird}) => {
        const initialStats = tinybird.getStats();
        
        // Create hits with auto-generated sessions
        await tinybird.createPageHit();
        await tinybird.createPageHit();
        
        // Create hits with manual sessions
        const session = tinybird.createNewSession();
        await tinybird.createSessionHits(session, 3);
        
        const finalStats = tinybird.getStats();
        expect(finalStats.sessions).toBe(initialStats.sessions + 3); // 2 auto + 1 manual
        expect(finalStats.events).toBe(initialStats.events + 5);
    });
    
    test('should format timestamps correctly', async ({tinybird}) => {
        const customDate = new Date('2024-01-15T10:30:45.123Z');
        const hit = await tinybird.createPageHit({
            timestamp: customDate
        });
        
        // Tinybird expects format: "2024-01-15 10:30:45.123"
        expect(hit.timestamp).toBe('2024-01-15 10:30:45.123');
    });
    
    test('should generate proper href URLs', async ({tinybird}) => {
        const testCases = [
            {pathname: '/', expected: 'https://example.com/'},
            {pathname: '/about', expected: 'https://example.com/about'},
            {pathname: '/posts/my-post', expected: 'https://example.com/posts/my-post'}
        ];
        
        for (const {pathname, expected} of testCases) {
            const hit = await tinybird.createPageHit({pathname});
            expect(hit.payload.href).toBe(expected);
        }
    });
    
    test('should allow custom session IDs in page hits', async ({tinybird}) => {
        const customSessionId = 'test-session-123';
        const hit = await tinybird.createPageHit({
            session_id: customSessionId
        });
        
        expect(hit.session_id).toBe(customSessionId);
        
        // Should still track the session
        const stats = tinybird.getStats();
        expect(stats.sessions).toBeGreaterThan(0);
    });
});