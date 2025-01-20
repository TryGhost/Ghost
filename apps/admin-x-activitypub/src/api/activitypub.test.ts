import {Activity, ActivityPubAPI} from './activitypub';

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
    describe('getInbox', function () {
        test('It passes the token to the inbox endpoint', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/inbox/index': {
                    async assert(_resource, init) {
                        const headers = new Headers(init?.headers);
                        expect(headers.get('Authorization')).toContain('fake-token');
                    },
                    response: JSONResponse({
                        type: 'Collection',
                        items: []
                    })
                }
            });
            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            await api.getInbox();
        });

        test('Returns an empty array when the inbox is empty', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/inbox/index': {
                    response: JSONResponse({
                        type: 'Collection',
                        items: []
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
            const expected: never[] = [];

            expect(actual).toEqual(expected);
        });

        test('Returns all the items array when the inbox is not empty', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/inbox/index': {
                    response:
                     JSONResponse({
                         type: 'Collection',
                         orderedItems: [{
                             type: 'Create',
                             object: {
                                 type: 'Note'
                             }
                         }]
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
            const expected: Activity[] = [
                {
                    type: 'Create',
                    object: {
                        type: 'Note'
                    }
                }
            ];

            expect(actual).toEqual(expected);
        });

        test('Returns an array when the orderedItems key is a single object', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/inbox/index': {
                    response:
                     JSONResponse({
                         type: 'Collection',
                         orderedItems: {
                             type: 'Create',
                             object: {
                                 type: 'Note'
                             }
                         }
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
            const expected: Activity[] = [
                {
                    type: 'Create',
                    object: {
                        type: 'Note'
                    }
                }
            ];

            expect(actual).toEqual(expected);
        });
    });

    describe('getOutbox', function () {
        test('It passes the token to the outbox collection endpoint', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/outbox/index?cursor=0': {
                    async assert(_resource, init) {
                        const headers = new Headers(init?.headers);
                        expect(headers.get('Authorization')).toContain('fake-token');
                    },
                    response: JSONResponse({
                        type: 'OrderedCollection',
                        orderedItems: []
                    })
                }
            });
            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            await api.getOutbox();
        });

        test('It returns an array of activities in the outbox collection', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/outbox/index?cursor=0`]: {
                    response: JSONResponse({
                        type: 'OrderedCollection',
                        orderedItems: [
                            {id: 'https://example.com/activity/1'},
                            {id: 'https://example.com/activity/2'}
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

            const actual = await api.getOutbox();

            expect(actual.data).toEqual([
                {id: 'https://example.com/activity/1'},
                {id: 'https://example.com/activity/2'}
            ]);
        });

        test('It returns next if it is present in the response', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/outbox/index?cursor=0`]: {
                    response: JSONResponse({
                        type: 'OrderedCollection',
                        orderedItems: [],
                        next: 'https://activitypub.api/.ghost/activitypub/outbox/index?cursor=2'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getOutbox();

            expect(actual.next).toEqual('2');
        });

        test('It returns a default return value when the response is null', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/outbox/index?cursor=0`]: {
                    response: JSONResponse(null)
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getOutbox();
            const expected = {
                data: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value if orderedItems is not present in the response', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/outbox/index?cursor=0`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getOutbox();
            const expected = {
                data: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns an empty array if orderedItems in the response is not an array', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/outbox/index?cursor=0`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getOutbox();

            expect(actual.data).toEqual([]);
        });
    });

    describe('getFollowing', function () {
        test('It passes the token to the following collection endpoint', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/following/index?cursor=0': {
                    async assert(_resource, init) {
                        const headers = new Headers(init?.headers);
                        expect(headers.get('Authorization')).toContain('fake-token');
                    },
                    response: JSONResponse({
                        type: 'OrderedCollection',
                        orderedItems: []
                    })
                }
            });
            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            await api.getFollowing();
        });

        test('It returns an array of actors in the following collection', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/following/index?cursor=0`]: {
                    response: JSONResponse({
                        type: 'OrderedCollection',
                        orderedItems: [
                            {id: 'https://example.com/person/1'},
                            {id: 'https://example.com/person/2'}
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

            const actual = await api.getFollowing();

            expect(actual.data).toEqual([
                {id: 'https://example.com/person/1'},
                {id: 'https://example.com/person/2'}
            ]);
        });

        test('It returns next if it is present in the response', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/following/index?cursor=0`]: {
                    response: JSONResponse({
                        type: 'OrderedCollection',
                        orderedItems: [],
                        next: 'https://activitypub.api/.ghost/activitypub/following/index?cursor=2'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFollowing();

            expect(actual.next).toEqual('2');
        });

        test('It returns a default return value when the response is null', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/following/index?cursor=0`]: {
                    response: JSONResponse(null)
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFollowing();
            const expected = {
                data: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value if orderedItems is not present in the response', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/following/index?cursor=0`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFollowing();
            const expected = {
                data: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns an empty array if orderedItems in the response is not an array', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/following/index?cursor=0`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFollowing();

            expect(actual.data).toEqual([]);
        });
    });

    describe('getFollowers', function () {
        test('It passes the token to the followers collection endpoint', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/followers/index?cursor=0': {
                    async assert(_resource, init) {
                        const headers = new Headers(init?.headers);
                        expect(headers.get('Authorization')).toContain('fake-token');
                    },
                    response: JSONResponse({
                        type: 'OrderedCollection',
                        orderedItems: []
                    })
                }
            });
            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            await api.getFollowers();
        });

        test('It returns an array of actors in the followers collection', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/followers/index?cursor=0`]: {
                    response: JSONResponse({
                        type: 'OrderedCollection',
                        orderedItems: [
                            {id: 'https://example.com/person/1'},
                            {id: 'https://example.com/person/2'}
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

            const actual = await api.getFollowers();

            expect(actual.data).toEqual([
                {id: 'https://example.com/person/1'},
                {id: 'https://example.com/person/2'}
            ]);
        });

        test('It returns next if it is present in the response', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/followers/index?cursor=0`]: {
                    response: JSONResponse({
                        type: 'OrderedCollection',
                        orderedItems: [],
                        next: 'https://activitypub.api/.ghost/activitypub/following/index?cursor=2'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFollowers();

            expect(actual.next).toEqual('2');
        });

        test('It returns a default return value when the response is null', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/followers/index?cursor=0`]: {
                    response: JSONResponse(null)
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFollowers();
            const expected = {
                data: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value if orderedItems is not present in the response', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/followers/index?cursor=0`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFollowers();
            const expected = {
                data: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns an empty array if orderedItems in the response is not an array', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/followers/index?cursor=0`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getFollowers();

            expect(actual.data).toEqual([]);
        });
    });

    describe('getLiked', function () {
        test('It passes the token to the liked collection endpoint', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/liked/index?cursor=0': {
                    async assert(_resource, init) {
                        const headers = new Headers(init?.headers);
                        expect(headers.get('Authorization')).toContain('fake-token');
                    },
                    response: JSONResponse({
                        type: 'OrderedCollection',
                        orderedItems: []
                    })
                }
            });
            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            await api.getLiked();
        });

        test('It returns an array of liked activities in the liked collection', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/liked/index?cursor=0`]: {
                    response: JSONResponse({
                        type: 'OrderedCollection',
                        orderedItems: [
                            {id: 'https://example.com/activity/1'},
                            {id: 'https://example.com/activity/2'}
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

            const actual = await api.getLiked();

            expect(actual.data).toEqual([
                {id: 'https://example.com/activity/1'},
                {id: 'https://example.com/activity/2'}
            ]);
        });

        test('It returns next if it is present in the response', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/liked/index?cursor=0`]: {
                    response: JSONResponse({
                        type: 'OrderedCollection',
                        orderedItems: [],
                        next: 'https://activitypub.api/.ghost/activitypub/following/index?cursor=2'
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getLiked();

            expect(actual.next).toEqual('2');
        });

        test('It returns a default return value when the response is null', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/liked/index?cursor=0`]: {
                    response: JSONResponse(null)
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getLiked();
            const expected = {
                data: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns a default return value if orderedItems is not present in the response', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/liked/index?cursor=0`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getLiked();
            const expected = {
                data: [],
                next: null
            };

            expect(actual).toEqual(expected);
        });

        test('It returns an empty array if orderedItems in the response is not an array', async function () {
            const fakeFetch = Fetch({
                [`https://activitypub.api/.ghost/activitypub/liked/index?cursor=0`]: {
                    response: JSONResponse({})
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getLiked();

            expect(actual.data).toEqual([]);
        });
    });

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

    describe('getProfile', function () {
        test('It returns a profile', async function () {
            const handle = '@foo@bar.baz';

            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/profile/${handle}`]: {
                    response: JSONResponse({
                        handle,
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

            const actual = await api.getProfile(handle);
            const expected = {
                handle,
                name: 'Foo Bar'
            };

            expect(actual).toEqual(expected);
        });
    });

    describe('getFollowersForProfile', function () {
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

            const actual = await api.getFollowersForProfile(handle);

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

            const actual = await api.getFollowersForProfile(handle);

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

            const actual = await api.getFollowersForProfile(handle, next);
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

            const actual = await api.getFollowersForProfile(handle);
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

            const actual = await api.getFollowersForProfile(handle);
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

            const actual = await api.getFollowersForProfile(handle);

            expect(actual.followers).toEqual([]);
        });
    });

    describe('getFollowingForProfile', function () {
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

            const actual = await api.getFollowingForProfile(handle);

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

            const actual = await api.getFollowingForProfile(handle);

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

            const actual = await api.getFollowingForProfile(handle, next);
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

            const actual = await api.getFollowingForProfile(handle);
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

            const actual = await api.getFollowingForProfile(handle);
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

            const actual = await api.getFollowingForProfile(handle);

            expect(actual.following).toEqual([]);
        });
    });

    describe('getPostsForProfile', function () {
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

            const actual = await api.getPostsForProfile(handle);

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

            const actual = await api.getPostsForProfile(handle);

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

            const actual = await api.getPostsForProfile(handle, next);
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

            const actual = await api.getPostsForProfile(handle);
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

            const actual = await api.getPostsForProfile(handle);
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

            const actual = await api.getPostsForProfile(handle);

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
});
