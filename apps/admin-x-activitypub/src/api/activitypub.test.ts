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

    describe('getFollowing', function () {
        test('It passes the token to the following endpoint', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/following/index': {
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

            await api.getFollowing();
        });

        test('Returns an empty array when the following is empty', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/following/index': {
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

            const actual = await api.getFollowing();
            const expected: never[] = [];

            expect(actual).toEqual(expected);
        });

        test('Returns all the items array when the following is not empty', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/following/index': {
                    response:
                     JSONResponse({
                         type: 'Collection',
                         orderedItems: [{
                             type: 'Person'
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

            const actual = await api.getFollowing();
            const expected: Activity[] = [
                {
                    type: 'Person'
                }
            ];

            expect(actual).toEqual(expected);
        });

        test('Returns an array when the items key is a single object', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/following/index': {
                    response:
                     JSONResponse({
                         type: 'Collection',
                         items: {
                             type: 'Person'
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

            const actual = await api.getFollowing();
            const expected: Activity[] = [
                {
                    type: 'Person'
                }
            ];

            expect(actual).toEqual(expected);
        });
    });

    describe('getFollowers', function () {
        test('It passes the token to the followers endpoint', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/followers/index': {
                    async assert(_resource, init) {
                        const headers = new Headers(init?.headers);
                        expect(headers.get('Authorization')).toContain('fake-token');
                    },
                    response: JSONResponse({
                        type: 'Collection',
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

        test('Returns an empty array when the followers is empty', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/followers/index': {
                    response: JSONResponse({
                        type: 'Collection',
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

            const actual = await api.getFollowers();
            const expected: never[] = [];

            expect(actual).toEqual(expected);
        });

        test('Returns all the items array when the followers is not empty', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/followers/index': {
                    response:
                     JSONResponse({
                         type: 'Collection',
                         orderedItems: [{
                             type: 'Person'
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

            const actual = await api.getFollowers();
            const expected: Activity[] = [
                {
                    type: 'Person'
                }
            ];

            expect(actual).toEqual(expected);
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

    describe('getAllActivities', function () {
        test('It fetches all activities navigating pagination', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/activities/index?limit=50': {
                    response: JSONResponse({
                        items: [{type: 'Create', object: {type: 'Note'}}],
                        nextCursor: 'next-cursor'
                    })
                },
                'https://activitypub.api/.ghost/activitypub/activities/index?limit=50&cursor=next-cursor': {
                    response: JSONResponse({
                        items: [{type: 'Announce', object: {type: 'Article'}}],
                        nextCursor: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getAllActivities();
            const expected: Activity[] = [
                {type: 'Create', object: {type: 'Note'}},
                {type: 'Announce', object: {type: 'Article'}}
            ];

            expect(actual).toEqual(expected);
        });

        test('It fetches a user\'s own activities', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/activities/index?limit=50&includeOwn=true': {
                    response: JSONResponse({
                        items: [{type: 'Create', object: {type: 'Note'}}],
                        nextCursor: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getAllActivities(true);
            const expected: Activity[] = [
                {type: 'Create', object: {type: 'Note'}}
            ];

            expect(actual).toEqual(expected);
        });

        test('It fetches activities with replies', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/activities/index?limit=50&includeReplies=true': {
                    response: JSONResponse({
                        items: [{type: 'Create', object: {type: 'Note'}}],
                        nextCursor: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getAllActivities(false, true);
            const expected: Activity[] = [
                {type: 'Create', object: {type: 'Note'}}
            ];

            expect(actual).toEqual(expected);
        });

        test('It fetches filtered activities', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                [`https://activitypub.api/.ghost/activitypub/activities/index?limit=50&filter=%7B%22type%22%3A%5B%22Create%3ANote%22%5D%7D`]: {
                    response: JSONResponse({
                        items: [{type: 'Create', object: {type: 'Note'}}],
                        nextCursor: null
                    })
                }
            });

            const api = new ActivityPubAPI(
                new URL('https://activitypub.api'),
                new URL('https://auth.api'),
                'index',
                fakeFetch
            );

            const actual = await api.getAllActivities(false, false, {type: ['Create:Note']});
            const expected: Activity[] = [
                {type: 'Create', object: {type: 'Note'}}
            ];

            expect(actual).toEqual(expected);
        });
    });

    describe('search', function () {
        test('It returns the results of the search', async function () {
            const fakeFetch = Fetch({
                'https://auth.api/': {
                    response: JSONResponse({
                        identities: [{
                            token: 'fake-token'
                        }]
                    })
                },
                'https://activitypub.api/.ghost/activitypub/actions/search?query=%40foo%40bar.baz': {
                    response: JSONResponse({
                        profiles: [
                            {
                                handle: '@foo@bar.baz',
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

            const actual = await api.search('@foo@bar.baz');
            const expected = {
                profiles: [
                    {
                        handle: '@foo@bar.baz',
                        name: 'Foo Bar'
                    }
                ]
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
                        followers: {}
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
        test('It returns a following arrayfor a profile', async function () {
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
                        following: {}
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
});
