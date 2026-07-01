import inboxFixture from '../utils/responses/activitypub/inbox.json' with {type: 'json'};
import {expect, test} from '@playwright/test';
import {mockApi} from '@tryghost/admin-x-framework/test/acceptance';
import {mockInitialApiRequests} from '../utils/initial-api-requests';

test.describe('DOM validation for rendered AP content', async () => {
    test.beforeEach(async ({page}) => {
        await mockInitialApiRequests(page);
    });

    test('Article title containing HTML tags is rendered as text in the reader', async ({page}) => {
        const titleWithHtml = '</h1><script>window.__test_title=true</script><h1>';
        const testPost = {
            ...inboxFixture.posts[0],
            title: titleWithHtml
        };

        const testInbox = {
            ...inboxFixture,
            posts: [testPost, ...inboxFixture.posts.slice(1)]
        };

        await mockApi({page, requests: {
            getInbox: {
                method: 'GET',
                path: '/v1/feed/reader',
                response: testInbox
            },
            getDiscoveryFeed: {
                method: 'GET',
                path: '/v1/feed/discover/top',
                response: testInbox
            },
            getPost: {
                method: 'GET',
                path: `/v1/replies/${encodeURIComponent(testPost.id)}`,
                response: {
                    ...testPost,
                    post: {
                        ...testPost,
                        metadata: {
                            ghostAuthors: []
                        }
                    },
                    ancestors: {
                        chain: [],
                        next: null
                    },
                    children: [],
                    next: null
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/reader');

        const inboxList = page.getByTestId('inbox-list');
        await expect(inboxList).toBeVisible();

        const posts = page.getByTestId('inbox-item');
        await expect(posts).toHaveCount(10);

        // Click the first post (the one with HTML in the title)
        await posts.first().click();

        await expect(page).toHaveURL(new RegExp(`/reader/${encodeURIComponent(testPost.id)}`));

        await page.waitForSelector('[role="dialog"]', {timeout: 10000});

        const modal = page.getByRole('dialog');
        const iframe = modal.locator('iframe');
        await expect(iframe).toBeVisible();

        const iframeContent = iframe.contentFrame();

        // Verify inline script tags from the title are not present in the DOM
        const scriptCount = await iframeContent.locator('script:not([src])').evaluateAll(
            scripts => scripts.filter(s => s.textContent?.includes('__test_title')).length
        );
        expect(scriptCount).toBe(0);

        // Verify the title text is visible as escaped content
        const heading = iframeContent.locator('[data-test-article-heading]');
        await expect(heading).toBeVisible();
        const headingText = await heading.textContent();
        expect(headingText).toContain('<script>');
    });

    test('Article with a javascript: URL does not render it as a link href', async ({page}) => {
        const testPost = {
            ...inboxFixture.posts[0],
            url: 'javascript:alert(document.cookie)'
        };

        const testInbox = {
            ...inboxFixture,
            posts: [testPost, ...inboxFixture.posts.slice(1)]
        };

        await mockApi({page, requests: {
            getInbox: {
                method: 'GET',
                path: '/v1/feed/reader',
                response: testInbox
            },
            getDiscoveryFeed: {
                method: 'GET',
                path: '/v1/feed/discover/top',
                response: testInbox
            },
            getPost: {
                method: 'GET',
                path: `/v1/replies/${encodeURIComponent(testPost.id)}`,
                response: {
                    ...testPost,
                    post: {
                        ...testPost,
                        metadata: {
                            ghostAuthors: []
                        }
                    },
                    ancestors: {
                        chain: [],
                        next: null
                    },
                    children: [],
                    next: null
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/reader');

        const inboxList = page.getByTestId('inbox-list');
        await expect(inboxList).toBeVisible();

        const posts = page.getByTestId('inbox-item');
        await expect(posts).toHaveCount(10);

        await posts.first().click();
        await page.waitForSelector('[role="dialog"]', {timeout: 10000});

        const modal = page.getByRole('dialog');
        const iframe = modal.locator('iframe');
        await expect(iframe).toBeVisible();

        const iframeContent = iframe.contentFrame();

        // Verify the meta link does not contain the javascript: URL
        const metaLink = iframeContent.locator('.gh-article-meta');
        await expect(metaLink).toBeVisible();
        const href = await metaLink.getAttribute('href');
        expect(href).toBe('#');

        // Verify the source hostname is not displayed
        const sourceSpan = iframeContent.locator('.gh-article-source');
        const sourceText = await sourceSpan.textContent();
        expect(sourceText?.trim()).not.toContain('javascript');
    });

    test('Article excerpt containing HTML tags is rendered as text in the reader', async ({page}) => {
        const excerptWithHtml = '<script>window.__test_excerpt=true</script>Test excerpt';
        const testPost = {
            ...inboxFixture.posts[0],
            excerpt: excerptWithHtml,
            summary: excerptWithHtml
        };

        const testInbox = {
            ...inboxFixture,
            posts: [testPost, ...inboxFixture.posts.slice(1)]
        };

        await mockApi({page, requests: {
            getInbox: {
                method: 'GET',
                path: '/v1/feed/reader',
                response: testInbox
            },
            getDiscoveryFeed: {
                method: 'GET',
                path: '/v1/feed/discover/top',
                response: testInbox
            },
            getPost: {
                method: 'GET',
                path: `/v1/replies/${encodeURIComponent(testPost.id)}`,
                response: {
                    ...testPost,
                    post: {
                        ...testPost,
                        metadata: {
                            ghostAuthors: []
                        }
                    },
                    ancestors: {
                        chain: [],
                        next: null
                    },
                    children: [],
                    next: null
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/reader');

        const inboxList = page.getByTestId('inbox-list');
        await expect(inboxList).toBeVisible();

        const posts = page.getByTestId('inbox-item');
        await expect(posts).toHaveCount(10);

        await posts.first().click();
        await page.waitForSelector('[role="dialog"]', {timeout: 10000});

        const modal = page.getByRole('dialog');
        const iframe = modal.locator('iframe');
        await expect(iframe).toBeVisible();

        const iframeContent = iframe.contentFrame();

        // Verify inline script tags from the excerpt are not present in the DOM
        const scriptCount = await iframeContent.locator('script:not([src])').evaluateAll(
            scripts => scripts.filter(s => s.textContent?.includes('__test_excerpt')).length
        );
        expect(scriptCount).toBe(0);

        // Verify the HTML is displayed as escaped text in the excerpt
        const excerptElement = iframeContent.locator('.gh-article-excerpt');
        await expect(excerptElement).toBeVisible();
        const excerptText = await excerptElement.textContent();
        expect(excerptText).toContain('<script>');
    });

    test('Notification content preserves safe profile links while removing unsafe HTML', async ({page}) => {
        await mockApi({page, requests: {
            getNotifications: {
                method: 'GET',
                path: '/v1/notifications',
                response: {
                    notifications: [{
                        id: 'notification-1',
                        type: 'mention',
                        actor: {
                            id: 'actor-1',
                            name: 'Alice',
                            url: 'https://example.com/@alice',
                            handle: '@alice@example.com',
                            avatarUrl: null,
                            followedByMe: true
                        },
                        post: {
                            id: 'post-1',
                            type: 'note',
                            title: null,
                            content: '<p>Hello <a href="https://example.com" data-profile="@alice@example.com" onpointerenter="window.__xss=true">safe link</a> and <a href="javascript:alert(1)" onclick="window.__xss=true">unsafe link</a></p>',
                            url: 'https://example.com/post-1',
                            likeCount: 0,
                            likedByMe: false,
                            repostCount: 0,
                            repostedByMe: false,
                            replyCount: 0,
                            attachments: []
                        },
                        inReplyTo: null,
                        createdAt: '2026-06-03T10:00:00.000Z'
                    }],
                    next: null
                }
            },
            getNotificationsCount: {
                method: 'GET',
                path: '/v1/notifications/unread/count',
                response: {
                    count: 0
                }
            },
            getTopics: {
                method: 'GET',
                path: '/v1/topics',
                response: {
                    topics: []
                }
            }
        }, options: {useActivityPub: true}});

        await page.goto('#/notifications');

        const safeLink = page.locator('.ap-note-content a', {hasText: /^safe link$/});
        await expect(safeLink).toBeVisible();
        await expect(safeLink).toHaveAttribute('href', 'https://example.com');
        await expect(safeLink).toHaveAttribute('data-profile', '@alice@example.com');

        const unsafeLink = page.locator('.ap-note-content a', {hasText: /^unsafe link$/});
        await expect(unsafeLink).toBeVisible();
        await expect(unsafeLink).not.toHaveAttribute('href', /javascript:/i);
        await expect(page.locator('.ap-note-content [onpointerenter], .ap-note-content [onclick]')).toHaveCount(0);

        await safeLink.hover();
        await unsafeLink.click();

        const xssValue = await page.evaluate(() => (window as Window & {__xss?: boolean}).__xss);
        expect(xssValue).toBeUndefined();
    });
});
