import './styles/index.css';
import App from './App.tsx';
import renderStandaloneApp from '@tryghost/admin-x-framework/test/render';

// Debug URL information
// eslint-disable-next-line no-console
console.log('📍 Current URL:', {
    href: window.location.href,
    pathname: window.location.pathname,
    hash: window.location.hash,
    search: window.location.search
});

if (import.meta.env.VITE_TEST) {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        // eslint-disable-next-line no-console
        console.log('🌐 Fetch intercepted:', {
            url,
            method: init?.method || 'GET',
            headers: init?.headers
        });

        // Mock the current user endpoint
        if (url.includes('/ghost/api/admin/users/me')) {
            // eslint-disable-next-line no-console
            console.log('✅ Mocking /users/me endpoint');
            const mockResponse = {
                users: [{
                    id: '1',
                    name: 'Test User',
                    email: 'test@example.com',
                    profile_image: null,
                    accessibility: JSON.stringify({
                        apOnboarding: {
                            welcomeStepsFinished: true,
                            exploreExplainerClosed: true
                        }
                    }),
                    roles: [{
                        id: '1',
                        name: 'Owner',
                        description: 'Owner'
                    }]
                }]
            };
            // eslint-disable-next-line no-console
            console.log('📤 Returning mock data:', mockResponse);
            return new Response(JSON.stringify(mockResponse), {
                status: 200,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // Mock the site endpoint
        if (url.includes('/ghost/api/admin/site')) {
            // eslint-disable-next-line no-console
            console.log('✅ Mocking /site endpoint');
            const mockResponse = {
                site: {
                    title: 'Test Site',
                    description: 'Test site description',
                    url: 'http://localhost:5173',
                    version: '5.0.0'
                }
            };
            return new Response(JSON.stringify(mockResponse), {
                status: 200,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // Mock the identities endpoint
        if (url.includes('/ghost/api/admin/identities/')) {
            // eslint-disable-next-line no-console
            console.log('✅ Mocking /identities endpoint');
            const mockResponse = {
                identities: [{
                    id: '1',
                    name: 'Test User',
                    handle: '@test@localhost:5173'
                }]
            };
            return new Response(JSON.stringify(mockResponse), {
                status: 200,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // Mock the ActivityPub inbox endpoint
        if (url.includes('/.ghost/activitypub/inbox')) {
            // eslint-disable-next-line no-console
            console.log('✅ Mocking ActivityPub inbox endpoint');
            return new Response(JSON.stringify({
                posts: [
                    {
                        id: 'https://example.com/.ghost/activitypub/article/test1',
                        type: 1,
                        title: 'Welcome to ActivityPub Testing',
                        excerpt: 'This is a test post in your inbox.',
                        content: '<p>This is the content of the test post. ActivityPub is working!</p>',
                        url: 'https://example.com/test-post/',
                        featureImageUrl: null,
                        publishedAt: '2025-05-02T10:00:00.000Z',
                        likeCount: 5,
                        likedByMe: false,
                        replyCount: 2,
                        readingTimeMinutes: 1,
                        attachments: [],
                        author: {
                            id: '2001',
                            handle: '@author@example.com',
                            name: 'Test Author',
                            url: 'https://example.com',
                            avatarUrl: null
                        },
                        authoredByMe: false,
                        repostCount: 1,
                        repostedByMe: false,
                        repostedBy: null
                    },
                    {
                        id: 'https://another.com/.ghost/activitypub/article/test2',
                        type: 1,
                        title: 'Another Test Post',
                        excerpt: 'Testing the ActivityPub inbox functionality.',
                        content: '<p>More test content here.</p>',
                        url: 'https://another.com/another-test/',
                        featureImageUrl: null,
                        publishedAt: '2025-05-01T15:30:00.000Z',
                        likeCount: 3,
                        likedByMe: false,
                        replyCount: 0,
                        readingTimeMinutes: 1,
                        attachments: [],
                        author: {
                            id: '2002',
                            handle: '@writer@another.com',
                            name: 'Another Writer',
                            url: 'https://another.com',
                            avatarUrl: null
                        },
                        authoredByMe: false,
                        repostCount: 0,
                        repostedByMe: false,
                        repostedBy: null
                    }
                ],
                next: '2025-05-01T15:30:00.000Z'
            }), {
                status: 200,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // Mock the ActivityPub account endpoints
        if (url.includes('/.ghost/activitypub/account/')) {
            // eslint-disable-next-line no-console
            console.log('✅ Mocking ActivityPub account endpoint:', url);

            // Different responses based on the account being requested
            if (url.includes('/me')) {
                return new Response(JSON.stringify({
                    id: '1',
                    handle: '@test@localhost:5173',
                    name: 'Test User',
                    username: 'test',
                    avatarUrl: null,
                    bio: 'Test bio',
                    followersCount: 0,
                    followingCount: 0,
                    postsCount: 0
                }), {
                    status: 200,
                    headers: {'Content-Type': 'application/json'}
                });
            } else {
                // For other accounts, return a mock account
                const handle = url.match(/@([^@]+)@([^/]+)/)?.[0] || '@unknown@unknown';
                return new Response(JSON.stringify({
                    id: Math.random().toString(),
                    handle: handle,
                    name: handle.split('@')[1],
                    username: handle.split('@')[1],
                    avatarUrl: null,
                    bio: `Bio for ${handle}`,
                    followersCount: Math.floor(Math.random() * 100),
                    followingCount: Math.floor(Math.random() * 100),
                    postsCount: Math.floor(Math.random() * 50)
                }), {
                    status: 200,
                    headers: {'Content-Type': 'application/json'}
                });
            }
        }

        // Mock the ActivityPub user endpoint
        if (url.includes('/activitypub/users/')) {
            // eslint-disable-next-line no-console
            console.log('✅ Mocking /activitypub/users endpoint');
            return new Response(JSON.stringify({
                id: '1',
                handle: '@test@example.com',
                name: 'Test User',
                icon: {url: null},
                bio: 'Test bio'
            }), {
                status: 200,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // For all other requests, use the original fetch
        // eslint-disable-next-line no-console
        console.log('⏩ Passing through to original fetch');
        return originalFetch(input, init);
    };
}

renderStandaloneApp(App, {});
