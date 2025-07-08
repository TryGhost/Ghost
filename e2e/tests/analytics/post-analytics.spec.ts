import {test, expect} from '@playwright/test';
import {PostAnalyticsPage} from '../../helpers'; // Doesn't exist yet
import {postFactory, sessionFactory} from '../../helpers'; // Doesn't exist yet

test.describe('Post Analytics', () => {
    test.describe('Overview Tab', () => {
        test.use({timezoneId: 'America/Los_Angeles'});
        
        test('handles timezones correctly', async ({page}) => {
            // Steps to reproduce in plain english:
            // 1. Create a session that starts at midnight UTC by visiting any page on the site's frontend
            // 2. Publish a post at 12pm UTC, ~12 hours later
            // 3. Using the same session, visit the post at/after 12pm UTC
            // 4. View the Post Analytics page in Admin, with browser timezone set to America/Los_Angeles
            // 5. The "unique visitors" graph will show 0 unique visitors, because the session is attributed to the day before the post was published.
            
            // Arrange
            const siteUuid = crypto.randomUUID();
            const sessionId = crypto.randomUUID(); // Generate a random session ID
            const firstPageview = await pageviewFactory.create({
                site_uuid: siteUuid,
                path: '/',
                timestamp: new Date('2025-07-03T00:00:00Z'), // 3 July 2025 Midnight UTC / 2 July 2025 5pm in America/Los_Angeles
                session_id: sessionId
            });
            const post = await postFactory.create({
                published_at: new Date('2025-07-03T12:00:00Z') // 3 July 2025 12pm UTC / 3 July 2025 5am in America/Los_Angeles
            });
            const secondPageview = await pageviewFactory.create({
                site_uuid: siteUuid,
                path: `/${post.slug}`,
                post_uuid: post.uuid,
                timestamp: new Date('2025-07-03T13:00:00Z'), // 3 July 2025 1pm UTC / 3 July 2025 8am in America/Los_Angeles
                session_id: sessionId
            });
            await postAnalyticsPage.clock.setFixedTime('2025-07-04T00:00:00Z');

            // Act
            const postAnalyticsPage = new PostAnalyticsPage(page);
            await postAnalyticsPage.goto(post.id);
    
            // Assert
            // This assertion should fail, since we haven't fixed the bug yet
            // The session will be attributed to July 2nd, and the UI will filter to July 3+
            await expect(postAnalyticsPage.uniqueVisitorsCount).toHaveText('1');
        });
    });
});