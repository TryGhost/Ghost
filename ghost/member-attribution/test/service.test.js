// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const MemberAttributionService = require('../lib/service');

describe('MemberAttributionService', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new MemberAttributionService({});
        });
    });

    describe('getEventAttribution', function () {
        it('returns null if attribution_type is null', function () {
            const service = new MemberAttributionService({});
            const model = {
                id: 'event_id',
                get() {
                    return null;
                }
            };
            should(service.getEventAttribution(model)).eql(null);
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
                }
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
                title: 'added'
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
                }
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
                title: 'added'
            });
        });
    });
});
