require('should');

const MemberAttributionService = require('../lib/MemberAttributionService');

describe('MemberAttributionService', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new MemberAttributionService({});
        });
    });

    describe('getAttributionFromContext', function () {
        it('returns null if no context is provided', async function () {
            const service = new MemberAttributionService({
                getTrackingEnabled: () => true
            });
            const attribution = await service.getAttributionFromContext();

            should(attribution).be.null();
        });

        it('returns null if tracking is disabled is provided', async function () {
            const service = new MemberAttributionService({
                isTrackingEnabled: false
            });
            const attribution = await service.getAttributionFromContext();

            should(attribution).be.null();
        });

        it('returns attribution for importer context', async function () {
            const service = new MemberAttributionService({
                getTrackingEnabled: () => true
            });
            const attribution = await service.getAttributionFromContext({importer: true});

            should(attribution).containEql({referrerSource: 'Imported', referrerMedium: 'Member Importer'});
        });

        it('returns attribution for admin context', async function () {
            const service = new MemberAttributionService({
                getTrackingEnabled: () => true
            });
            const attribution = await service.getAttributionFromContext({user: 'abc'});

            should(attribution).containEql({referrerSource: 'Created manually', referrerMedium: 'Ghost Admin'});
        });

        it('returns attribution for api without integration context', async function () {
            const service = new MemberAttributionService({
                getTrackingEnabled: () => true
            });
            const attribution = await service.getAttributionFromContext({
                api_key: 'abc'
            });

            should(attribution).containEql({referrerSource: 'Created via API', referrerMedium: 'Admin API'});
        });

        it('returns attribution for api with integration context', async function () {
            const service = new MemberAttributionService({
                models: {
                    Integration: {
                        findOne: () => {
                            return {
                                get: () => 'Test Integration'
                            };
                        }
                    }
                },
                getTrackingEnabled: () => true
            });
            const attribution = await service.getAttributionFromContext({
                api_key: 'abc',
                integration: {id: 'integration_1'}
            });

            should(attribution).containEql({referrerSource: 'Integration: Test Integration', referrerMedium: 'Admin API'});
        });
    });

    describe('getEventAttribution', function () {
        it('returns null if attribution_type is null', function () {
            const service = new MemberAttributionService({
                attributionBuilder: {
                    build(attribution) {
                        return {
                            ...attribution,
                            getResource() {
                                return {
                                    ...attribution,
                                    title: 'added'
                                };
                            }
                        };
                    }
                },
                getTrackingEnabled: () => true
            });
            const model = {
                id: 'event_id',
                get() {
                    return null;
                }
            };
            should(service.getEventAttribution(model)).eql({
                id: null,
                url: null,
                title: 'added',
                type: null,
                referrerSource: null,
                referrerMedium: null,
                referrerUrl: null
            });
        });

        it('returns url attribution types', function () {
            const service = new MemberAttributionService({
                attributionBuilder: {
                    build(attribution) {
                        return {
                            ...attribution,
                            getResource() {
                                return {
                                    ...attribution,
                                    title: 'added'
                                };
                            }
                        };
                    }
                },
                getTrackingEnabled: () => true
            });
            const model = {
                id: 'event_id',
                get(name) {
                    if (name === 'attribution_type') {
                        return 'url';
                    }
                    if (name === 'attribution_url') {
                        return '/my/url/';
                    }
                    return null;
                }
            };
            should(service.getEventAttribution(model)).eql({
                id: null,
                type: 'url',
                url: '/my/url/',
                title: 'added',
                referrerMedium: null,
                referrerSource: null,
                referrerUrl: null
            });
        });

        it('returns first loaded relation', function () {
            const service = new MemberAttributionService({
                attributionBuilder: {
                    build(attribution) {
                        return {
                            ...attribution,
                            getResource() {
                                return {
                                    ...attribution,
                                    title: 'added'
                                };
                            }
                        };
                    }
                },
                getTrackingEnabled: () => true
            });
            const model = {
                id: 'event_id',
                get(name) {
                    if (name === 'attribution_type') {
                        return 'user';
                    }
                    if (name === 'attribution_url') {
                        return '/my/url/';
                    }
                    if (name.startsWith('referrer')) {
                        return null;
                    }
                    return 'test_user_id';
                },
                related(name) {
                    if (name === 'userAttribution') {
                        return {
                            id: 'test_user_id'
                        };
                    }
                    return {};
                }
            };
            should(service.getEventAttribution(model)).eql({
                id: 'test_user_id',
                type: 'user',
                url: '/my/url/',
                title: 'added',
                referrerMedium: null,
                referrerSource: null,
                referrerUrl: null
            });
        });
    });

    describe('getAttribution', function () {
        it('returns attribution from builder with history', async function () {
            const service = new MemberAttributionService({
                attributionBuilder: {
                    getAttribution: async function (history) {
                        should(history).have.property('length');
                        return {success: true};
                    }
                },
                getTrackingEnabled: () => true
            });
            const attribution = await service.getAttribution([{path: '/test'}]);
            should(attribution).deepEqual({success: true});
        });

        it('returns empty history attribution when tracking disabled', async function () {
            const service = new MemberAttributionService({
                attributionBuilder: {
                    getAttribution: async function (history) {
                        should(history).have.property('length', 0);
                        return {success: true};
                    }
                },
                getTrackingEnabled: () => false
            });
            const attribution = await service.getAttribution([{path: '/test'}]);
            should(attribution).deepEqual({success: true});
        });
    });

    describe('addPostAttributionTracking', function () {
        it('adds attribution params to url', function () {
            const service = new MemberAttributionService({});
            const url = new URL('https://example.com/test');
            const post = {id: 'post_123'};

            const result = service.addPostAttributionTracking(url, post);

            should(result.searchParams.get('attribution_id')).equal('post_123');
            should(result.searchParams.get('attribution_type')).equal('post');
        });

        it('does not overwrite existing attribution params', function () {
            const service = new MemberAttributionService({});
            const url = new URL('https://example.com/test?attribution_id=existing&attribution_type=existing');
            const post = {id: 'post_123'};

            const result = service.addPostAttributionTracking(url, post);

            should(result.searchParams.get('attribution_id')).equal('existing');
            should(result.searchParams.get('attribution_type')).equal('existing');
        });
    });

    describe('getMemberCreatedAttribution', function () {
        it('returns null when no event exists', async function () {
            const service = new MemberAttributionService({
                models: {
                    MemberCreatedEvent: {
                        findOne: () => null
                    }
                }
            });

            const result = await service.getMemberCreatedAttribution('member_123');
            should(result).be.null();
        });

        it('returns attribution from event', async function () {
            const service = new MemberAttributionService({
                models: {
                    MemberCreatedEvent: {
                        findOne: () => ({
                            get: function (key) {
                                const values = {
                                    attribution_id: 'attr_123',
                                    attribution_url: '/test',
                                    attribution_type: 'post',
                                    referrer_source: 'source',
                                    referrer_medium: 'medium',
                                    referrer_url: 'https://referrer.com'
                                };
                                return values[key];
                            }
                        })
                    }
                },
                attributionBuilder: {
                    build: function (attribution) {
                        return {
                            ...attribution,
                            fetchResource: async function () {
                                return {...attribution, title: 'Fetched'};
                            }
                        };
                    }
                }
            });

            const result = await service.getMemberCreatedAttribution('member_123');
            should(result).deepEqual({
                id: 'attr_123',
                url: '/test',
                type: 'post',
                referrerSource: 'source',
                referrerMedium: 'medium',
                referrerUrl: 'https://referrer.com',
                title: 'Fetched'
            });
        });
    });

    describe('getSubscriptionCreatedAttribution', function () {
        it('returns null when no event exists', async function () {
            const service = new MemberAttributionService({
                models: {
                    SubscriptionCreatedEvent: {
                        findOne: () => null
                    }
                }
            });

            const result = await service.getSubscriptionCreatedAttribution('subscription_123');
            should(result).be.null();
        });

        it('returns attribution from event', async function () {
            const service = new MemberAttributionService({
                models: {
                    SubscriptionCreatedEvent: {
                        findOne: () => ({
                            get: function (key) {
                                const values = {
                                    attribution_id: 'attr_123',
                                    attribution_url: '/test',
                                    attribution_type: 'post',
                                    referrer_source: 'source',
                                    referrer_medium: 'medium',
                                    referrer_url: 'https://referrer.com'
                                };
                                return values[key];
                            }
                        })
                    }
                },
                attributionBuilder: {
                    build: function (attribution) {
                        return {
                            ...attribution,
                            fetchResource: async function () {
                                return {...attribution, title: 'Fetched'};
                            }
                        };
                    }
                }
            });

            const result = await service.getSubscriptionCreatedAttribution('subscription_123');
            should(result).deepEqual({
                id: 'attr_123',
                url: '/test',
                type: 'post',
                referrerSource: 'source',
                referrerMedium: 'medium',
                referrerUrl: 'https://referrer.com',
                title: 'Fetched'
            });
        });
    });

    describe('fetchResource', function () {
        it('returns null when no attribution provided', async function () {
            const service = new MemberAttributionService({});
            const result = await service.fetchResource(null);
            should(result).be.null();
        });

        it('fetches resource using attribution builder', async function () {
            const service = new MemberAttributionService({
                attributionBuilder: {
                    build: function (attribution) {
                        return {
                            ...attribution,
                            fetchResource: async function () {
                                return {...attribution, title: 'Fetched'};
                            }
                        };
                    }
                }
            });

            const attribution = {
                id: 'attr_123',
                type: 'post',
                url: '/test'
            };

            const result = await service.fetchResource(attribution);
            should(result).deepEqual({
                id: 'attr_123',
                type: 'post',
                url: '/test',
                title: 'Fetched'
            });
        });
    });
});
