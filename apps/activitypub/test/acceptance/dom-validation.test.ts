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

    test('Twitter embed uses the direct iframe after sanitizer removes widget scripts', async ({page}) => {
        await page.addInitScript(() => {
            localStorage.setItem('ghost-ap-background-color', 'light');
            localStorage.setItem('ghost-ap-font-size', '2');
            localStorage.setItem('ghost-ap-font-style', 'sans');
        });

        let widgetScriptRequests = 0;
        await page.route('https://platform.twitter.com/widgets.js', async (route) => {
            widgetScriptRequests += 1;
            await route.fulfill({
                body: '',
                contentType: 'application/javascript',
                status: 200
            });
        });
        await page.route('https://platform.twitter.com/embed/Tweet.html**', async (route) => {
            await route.fulfill({
                body: `
                    <html>
                        <body>
                            <script>
                                window.addEventListener('message', (event) => {
                                    if (event.data && event.data.type === 'sendTwitterResize') {
                                        window.top.postMessage({
                                            twttr: {
                                                embed: {
                                                    method: 'twttr.private.resize',
                                                    params: [{
                                                        height: 480
                                                    }]
                                                }
                                            }
                                        }, '*');
                                    }
                                });
                                window.parent.postMessage({
                                    type: 'twitterEmbedReady'
                                }, '*');
                            </script>
                        </body>
                    </html>
                `,
                contentType: 'text/html',
                status: 200
            });
        });
        await page.route('https://example.com/rich-card.js', async (route) => {
            await route.fulfill({
                body: '',
                contentType: 'application/javascript',
                status: 200
            });
        });

        const twitterContent = [
            '<p>Before the Twitter embed.</p>',
            '<blockquote class="twitter-tweet">',
            '<p lang="en" dir="ltr">Ghost ActivityPub renders this embedded post without trusting remote ActivityPub scripts.</p>',
            '<a href="https://twitter.com/ghost/status/1234567890">March 20, 2025</a>',
            '</blockquote>',
            '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>',
            '<script src="https://example.com/rich-card.js"></script>',
            '<p>After the Twitter embed.</p>'
        ].join('');
        const testPost = {
            ...inboxFixture.posts[0],
            content: twitterContent,
            excerpt: 'Twitter embed direct iframe test',
            title: 'Twitter embed direct iframe test'
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
        const articleFrame = modal.locator('iframe').first().contentFrame();
        await expect(articleFrame.locator('script[src="https://platform.twitter.com/widgets.js"]')).toHaveCount(0);
        await expect(articleFrame.locator('script[src="https://example.com/rich-card.js"]')).toHaveCount(1);
        expect(widgetScriptRequests).toBe(0);

        const twitterEmbed = articleFrame.locator('iframe[data-gh-twitter-direct-embed]');
        await expect(twitterEmbed).toBeVisible();
        await expect(twitterEmbed).toHaveAttribute('data-tweet-id', '1234567890');
        await expect(twitterEmbed).toHaveAttribute('sandbox', /allow-scripts/);
        await expect(twitterEmbed).toHaveAttribute('sandbox', /allow-same-origin/);
        await expect.poll(() => twitterEmbed.getAttribute('src')).toContain('https://platform.twitter.com/embed/Tweet.html');
        await expect.poll(() => twitterEmbed.getAttribute('src')).toContain('id=1234567890');
        await expect.poll(() => twitterEmbed.getAttribute('src')).toContain('theme=light');
        await expect.poll(() => twitterEmbed.evaluate(iframe => (iframe as HTMLIFrameElement).style.height)).toBe('720px');
        await expect.poll(() => twitterEmbed.evaluate(iframe => (iframe as HTMLIFrameElement).getAttribute('scrolling'))).toBe('auto');
        await expect.poll(() => twitterEmbed.evaluate(iframe => (iframe as HTMLIFrameElement).style.overflow)).toBe('auto');
        await twitterEmbed.evaluate((iframe) => {
            (iframe as HTMLIFrameElement).contentWindow?.postMessage({type: 'sendTwitterResize'}, '*');
        });
        await expect.poll(() => twitterEmbed.evaluate(iframe => (iframe as HTMLIFrameElement).style.height)).toBe('480px');

        await modal.locator('.sticky button').last().click();

        const customizerButtons = page.locator('[data-radix-popper-content-wrapper] button');
        await customizerButtons.nth(3).click();
        await customizerButtons.nth(8).click();
        await page.getByRole('button', {name: 'Serif'}).click();

        await expect.poll(() => twitterEmbed.getAttribute('src')).toContain('theme=dark');
    });

    test('Article with a non-Twitter embed keeps the embed iframe in the reader', async ({page}) => {
        // Stub the embed so the test does not depend on the real network.
        await page.route('https://www.youtube.com/embed/**', async (route) => {
            await route.fulfill({
                body: '',
                contentType: 'text/html',
                status: 200
            });
        });

        const embedContent = [
            '<p>Before the embed.</p>',
            '<figure class="kg-card kg-embed-card">',
            '<iframe src="https://www.youtube.com/embed/aqz-KE-bpKQ" width="200" height="113" frameborder="0" allowfullscreen></iframe>',
            '</figure>',
            '<p>After the embed.</p>'
        ].join('');
        const testPost = {
            ...inboxFixture.posts[0],
            content: embedContent,
            excerpt: 'Embed rendering test',
            title: 'Embed rendering test'
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
        const articleFrame = modal.locator('iframe').first().contentFrame();

        // The embed iframe must survive content processing — a previous regression ran
        // the whole article through DOMPurify, which stripped all <iframe> embeds.
        await expect(articleFrame.locator('.gh-content iframe[src*="youtube.com"]')).toHaveCount(1);
        const twitterBridgeScriptCount = await articleFrame.locator('script:not([src])').evaluateAll(
            scripts => scripts.filter(s => s.textContent?.includes('ghost-twitter-embed-style')).length
        );
        expect(twitterBridgeScriptCount).toBe(0);
        await expect(articleFrame.getByText('Before the embed.')).toBeVisible();
        await expect(articleFrame.getByText('After the embed.')).toBeVisible();
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
