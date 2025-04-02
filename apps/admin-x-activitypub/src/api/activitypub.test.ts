import {ActivityPubAPI} from './activitypub';

function NotFound() {
    return new Response(null, {
        status: 404
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function JSONResponse(data: any, contentType = 'application/json', status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': contentType
        }
    });
}

type Spec = {
    response: Response,
    assert?: (resource: URL, init?: RequestInit) => Promise<void>
};

function Fetch(specs: Record<string, Spec>) {
    return async function (resource: URL, init?: RequestInit): Promise<Response> {
        const spec = specs[resource.href];
        if (!spec) {
            return NotFound();
        }
        if (spec.assert) {
            await spec.assert(resource, init);
        }
        return spec.response;
    };
}

describe('ActivityPubAPI', function () {
    describe('follow', function () {
        test('It passes the token to the follow endpoint', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/actions/follow/@user@domain.com': {
                    async assert(_resource, init) {
                        const headers = new Headers(init?.headers);
                        expect(headers.get('Authorization')).toContain('fake-token');
                    },
                    response: JSONResponse({})
                }
            });
            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            await api.follow('@user@domain.com');
        });
    });

    describe('note', function () {
        test('It creates a note and returns it', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/actions/note`]: {
                    async assert(_resource, init) {
                        expect(init?.method).toEqual('POST');
                        expect(init?.body).toEqual('{"content":"Hello, world!"}');
                    },
                    response: JSONResponse({
                        id: 'https://example.com/note/abc123'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const result = await api.note('Hello, world!');

            expect(result).toEqual({
                id: 'https://example.com/note/abc123'
            });
        });
    });

    describe('search', function () {
        test('It returns the results of the search', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/actions/search?query=${encodeURIComponent(handle)}`]: {
                    response: JSONResponse({
                        accounts: [
                            {
                                handle,
                                name: 'Foo Bar'
                            }
                        ]
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.search(handle);
            const expected = {
                accounts: [
                    {
                        handle,
                        name: 'Foo Bar'
                    }
                ]
            };

            expect(actual).toEqual(expected);
        });

        test('It returns an empty array when there are no accounts in the response', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/actions/search?query=${encodeURIComponent(handle)}`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.search(handle);
            const expected = {
                accounts: []
            };

            expect(actual).toEqual(expected);
        });
    });

    describe('getProfileFollowers', function () {
        test('It returns an array of followers for a profile', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/followers`]: {
                    response: JSONResponse({
                        followers: [
                            {
                                actor: {
                                    id: 'https://example.com/users/bar'
                                },
                                isFollowing: false
                            },
                            {
                                actor: {
                                    id: 'https://example.com/users/baz'
                                },
                                isFollowing: false
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfileFollowers(handle);

            expect(actual.followers).toEqual([
                {
                    actor: {
                        id: 'https://example.com/users/bar'
                    },
                    isFollowing: false
                },
                {
                    actor: {
                        id: 'https://example.com/users/baz'
                    },
                    isFollowing: false
                }
            ]);
        });

        test('It returns next if it is present in the response', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/followers`]: {
                    response: JSONResponse({
                        followers: [],
                        next: 'abc123'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfileFollowers(handle);

            expect(actual.next).toEqual('abc123');
        });

        test('It includes next in the query when provided', async function () {
            const handle = '@foo@bar.baz';
            const next = 'abc123';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/followers?next=${next}`]: {
                    response: JSONResponse({
                        followers: [
                            {
                                actor: {
                                    id: 'https://example.com/users/qux'
                                },
                                isFollowing: false
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfileFollowers(handle, next);
            const expected = {
                followers: [
                    {
                        actor: {
                            id: 'https://example.com/users/qux'
                        },
                        isFollowing: false
                    }
                ],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value when the response is null', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/followers`]: {
                    response: JSONResponse(null)
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfileFollowers(handle);
            const expected = {
                followers: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value if followers is not present in the response', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/followers`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfileFollowers(handle);
            const expected = {
                followers: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns an empty array of followers if followers in the response is not an array', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/followers`]: {
                    response: JSONResponse({
                        followers: []
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfileFollowers(handle);

            expect(actual.followers).toEqual([]);
        });
    });

    describe('getProfileFollowing', function () {
        test('It returns an array of following actors for a profile', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/following`]: {
                    response: JSONResponse({
                        following: [
                            {
                                actor: {
                                    id: 'https://example.com/users/bar'
                                },
                                isFollowing: false
                            },
                            {
                                actor: {
                                    id: 'https://example.com/users/baz'
                                },
                                isFollowing: false
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfileFollowing(handle);

            expect(actual.following).toEqual([
                {
                    actor: {
                        id: 'https://example.com/users/bar'
                    },
                    isFollowing: false
                },
                {
                    actor: {
                        id: 'https://example.com/users/baz'
                    },
                    isFollowing: false
                }
            ]);
        });

        test('It returns next if it is present in the response', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/following`]: {
                    response: JSONResponse({
                        following: [],
                        next: 'abc123'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfileFollowing(handle);

            expect(actual.next).toEqual('abc123');
        });

        test('It includes next in the query when provided', async function () {
            const handle = '@foo@bar.baz';
            const next = 'abc123';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/following?next=${next}`]: {
                    response: JSONResponse({
                        following: [
                            {
                                actor: {
                                    id: 'https://example.com/users/qux'
                                },
                                isFollowing: false
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfileFollowing(handle, next);
            const expected = {
                following: [
                    {
                        actor: {
                            id: 'https://example.com/users/qux'
                        },
                        isFollowing: false
                    }
                ],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value when the response is null', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/following`]: {
                    response: JSONResponse(null)
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfileFollowing(handle);
            const expected = {
                following: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value if following is not present in the response', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/following`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfileFollowing(handle);
            const expected = {
                following: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns an empty following array if following in the response is not an array', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/following`]: {
                    response: JSONResponse({
                        following: []
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfileFollowing(handle);

            expect(actual.following).toEqual([]);
        });
    });

    describe('getProfilePosts', function () {
        test('It returns an array of posts for a profile', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/posts`]: {
                    response: JSONResponse({
                        posts: [
                            {
                                actor: {
                                    id: 'https://example.com/users/bar'
                                },
                                object: {
                                    content: 'Hello, world!'
                                }
                            },
                            {
                                actor: {
                                    id: 'https://example.com/users/baz'
                                },
                                object: {
                                    content: 'Hello, world again!'
                                }
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfilePosts(handle);

            expect(actual.posts).toEqual([
                {
                    actor: {
                        id: 'https://example.com/users/bar'
                    },
                    object: {
                        content: 'Hello, world!'
                    }
                },
                {
                    actor: {
                        id: 'https://example.com/users/baz'
                    },
                    object: {
                        content: 'Hello, world again!'
                    }
                }
            ]);
        });

        test('It returns next if it is present in the response', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/posts`]: {
                    response: JSONResponse({
                        posts: [],
                        next: 'abc123'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfilePosts(handle);

            expect(actual.next).toEqual('abc123');
        });

        test('It includes next in the query when provided', async function () {
            const handle = '@foo@bar.baz';
            const next = 'abc123';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/posts?next=${next}`]: {
                    response: JSONResponse({
                        posts: [
                            {
                                actor: {
                                    id: 'https://example.com/users/bar'
                                },
                                object: {
                                    content: 'Hello, world!'
                                }
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfilePosts(handle, next);
            const expected = {
                posts: [
                    {
                        actor: {
                            id: 'https://example.com/users/bar'
                        },
                        object: {
                            content: 'Hello, world!'
                        }
                    }
                ],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value when the response is null', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/posts`]: {
                    response: JSONResponse(null)
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfilePosts(handle);
            const expected = {
                posts: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value if followers is not present in the response', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/posts`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfilePosts(handle);
            const expected = {
                posts: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns an empty array of followers if followers in the response is not an array', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}/posts`]: {
                    response: JSONResponse({
                        posts: []
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getProfilePosts(handle);

            expect(actual.posts).toEqual([]);
        });
    });

    describe('getThread', function () {
        test('It returns a thread', async function () {
            const activityId = 'https://example.com/thread/abc123';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/thread/${encodeURIComponent(activityId)}`]: {
                    response: JSONResponse({
                        id: activityId,
                        name: 'Foo Bar'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getThread(activityId);
            const expected = {
                id: activityId,
                name: 'Foo Bar'
            };

            expect(actual).toEqual(expected);
        });
    });

    describe('getFeed', function () {
        test('It returns an array of posts', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/feed`]: {
                    response: JSONResponse({
                        posts: [
                            {
                                id: 'https://example.com/posts/abc123'
                            },
                            {
                                id: 'https://example.com/posts/def456'
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFeed();

            expect(actual.posts).toEqual([
                {
                    id: 'https://example.com/posts/abc123'
                },
                {
                    id: 'https://example.com/posts/def456'
                }
            ]);
        });

        test('It returns next if it is present in the response', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/feed`]: {
                    response: JSONResponse({
                        posts: [],
                        next: 'abc123'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFeed();
            expect(actual.next).toEqual('abc123');
        });

        test('It includes next in the query when provided', async function () {
            const next = 'abc123';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/feed?next=${next}`]: {
                    response: JSONResponse({
                        posts: [
                            {
                                id: 'https://example.com/posts/def456'
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFeed(next);
            const expected = {
                posts: [
                    {
                        id: 'https://example.com/posts/def456'
                    }
                ],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value when the response is null', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/feed`]: {
                    response: JSONResponse(null)
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFeed();
            const expected = {
                posts: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value if posts is not present in the response', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/feed`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFeed();
            const expected = {
                posts: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns an empty array of posts if posts in the response is not an array', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/feed`]: {
                    response: JSONResponse({
                        posts: []
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFeed();
            expect(actual.posts).toEqual([]);
        });
    });

    describe('getInbox', function () {
        test('It returns an array of posts', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/inbox`]: {
                    response: JSONResponse({
                        posts: [
                            {
                                id: 'https://example.com/posts/abc123'
                            },
                            {
                                id: 'https://example.com/posts/def456'
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getInbox();

            expect(actual.posts).toEqual([
                {
                    id: 'https://example.com/posts/abc123'
                },
                {
                    id: 'https://example.com/posts/def456'
                }
            ]);
        });

        test('It returns next if it is present in the response', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/inbox`]: {
                    response: JSONResponse({
                        posts: [],
                        next: 'abc123'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getInbox();

            expect(actual.next).toEqual('abc123');
        });

        test('It includes next in the query when provided', async function () {
            const next = 'abc123';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/inbox?next=${next}`]: {
                    response: JSONResponse({
                        posts: [
                            {
                                id: 'https://example.com/posts/def456'
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getInbox(next);
            const expected = {
                posts: [
                    {
                        id: 'https://example.com/posts/def456'
                    }
                ],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value when the response is null', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/inbox`]: {
                    response: JSONResponse(null)
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getInbox();
            const expected = {
                posts: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value if posts is not present in the response', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/inbox`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getInbox();
            const expected = {
                posts: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns an empty array of posts if posts in the response is not an array', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/inbox`]: {
                    response: JSONResponse({
                        posts: []
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getInbox();

            expect(actual.posts).toEqual([]);
        });
    });

    describe('getPostsByAccount', function () {
        test('It returns an array of posts', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/posts`]: {
                    response: JSONResponse({
                        posts: [
                            {
                                id: 'https://example.com/posts/abc123'
                            },
                            {
                                id: 'https://example.com/posts/def456'
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getPostsByAccount();

            expect(actual.posts).toEqual([
                {
                    id: 'https://example.com/posts/abc123'
                },
                {
                    id: 'https://example.com/posts/def456'
                }
            ]);
        });

        test('It returns next if it is present in the response', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/posts`]: {
                    response: JSONResponse({
                        posts: [],
                        next: 'abc123'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getPostsByAccount();

            expect(actual.next).toEqual('abc123');
        });

        test('It includes next in the query when provided', async function () {
            const next = 'abc123';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/posts?next=${next}`]: {
                    response: JSONResponse({
                        posts: [
                            {
                                id: 'https://example.com/posts/def456'
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getPostsByAccount(next);
            const expected = {
                posts: [
                    {
                        id: 'https://example.com/posts/def456'
                    }
                ],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value when the response is null', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/posts`]: {
                    response: JSONResponse(null)
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getPostsByAccount();
            const expected = {
                posts: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value if posts is not present in the response', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/posts`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getPostsByAccount();
            const expected = {
                posts: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns an empty array of posts if posts in the response is not an array', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/posts`]: {
                    response: JSONResponse({
                        posts: []
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getPostsByAccount();

            expect(actual.posts).toEqual([]);
        });
    });

    describe('getPostsLikedByAccount', function () {
        test('It returns an array of posts', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/posts/liked`]: {
                    response: JSONResponse({
                        posts: [
                            {
                                id: 'https://example.com/posts/abc123'
                            },
                            {
                                id: 'https://example.com/posts/def456'
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getPostsLikedByAccount();

            expect(actual.posts).toEqual([
                {
                    id: 'https://example.com/posts/abc123'
                },
                {
                    id: 'https://example.com/posts/def456'
                }
            ]);
        });

        test('It returns next if it is present in the response', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/posts/liked`]: {
                    response: JSONResponse({
                        posts: [],
                        next: 'abc123'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getPostsLikedByAccount();

            expect(actual.next).toEqual('abc123');
        });

        test('It includes next in the query when provided', async function () {
            const next = 'abc123';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/posts/liked?next=${next}`]: {
                    response: JSONResponse({
                        posts: [
                            {
                                id: 'https://example.com/posts/def456'
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getPostsLikedByAccount(next);
            const expected = {
                posts: [
                    {
                        id: 'https://example.com/posts/def456'
                    }
                ],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value when the response is null', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/posts/liked`]: {
                    response: JSONResponse(null)
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getPostsLikedByAccount();
            const expected = {
                posts: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value if posts is not present in the response', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/posts/liked`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getPostsLikedByAccount();
            const expected = {
                posts: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns an empty array of posts if posts in the response is not an array', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/posts/liked`]: {
                    response: JSONResponse({
                        posts: []
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getPostsLikedByAccount();

            expect(actual.posts).toEqual([]);
        });
    });

    describe('getNotifications', function () {
        test('It returns an array of notifications', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/notifications`]: {
                    response: JSONResponse({
                        notifications: [
                            {
                                id: 'https://example.com/notifications/abc123',
                                type: 'like'
                            },
                            {
                                id: 'https://example.com/notifications/def456',
                                type: 'reply'
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getNotifications();

            expect(actual.notifications).toEqual([
                {
                    id: 'https://example.com/notifications/abc123',
                    type: 'like'
                },
                {
                    id: 'https://example.com/notifications/def456',
                    type: 'reply'
                }
            ]);
        });

        test('It returns next if it is present in the response', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/notifications`]: {
                    response: JSONResponse({
                        notifications: [],
                        next: 'abc123'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getNotifications();

            expect(actual.next).toEqual('abc123');
        });

        test('It includes next in the query when provided', async function () {
            const next = 'abc123';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/notifications?next=${next}`]: {
                    response: JSONResponse({
                        notifications: [
                            {
                                id: 'https://example.com/notifications/def456',
                                type: 'like'
                            }
                        ],
                        next: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getNotifications(next);
            const expected = {
                notifications: [
                    {
                        id: 'https://example.com/notifications/def456',
                        type: 'like'
                    }
                ],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value when the response is null', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/notifications`]: {
                    response: JSONResponse(null)
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getNotifications();
            const expected = {
                notifications: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value if posts is not present in the response', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/notifications`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getNotifications();
            const expected = {
                notifications: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns an empty array of notifications if notifications in the response is not an array', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/notifications`]: {
                    response: JSONResponse({
                        notifications: []
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getNotifications();

            expect(actual.notifications).toEqual([]);
        });
    });

    describe('getPost', function () {
        test('It returns a post', async function () {
            const postId = 'https://example.com/posts/abc123';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/post/${encodeURIComponent(postId)}`]: {
                    response: JSONResponse({
                        id: postId,
                        title: 'Foo Bar Baz'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getPost(postId);
            const expected = {
                id: postId,
                title: 'Foo Bar Baz'
            };

            expect(actual).toEqual(expected);
        });
    });
});
