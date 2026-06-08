const assert = require('node:assert/strict');
const parseContext = require('../../../../../core/server/services/permissions/parse-context');

describe('Permissions', function () {
    describe('parseContext', function () {
        it('should return public for no context', function () {
            assert.deepEqual(parseContext(), {
                internal: false,
                user: null,
                api_key: null,
                member: null,
                public: true,
                integration: null
            });
            assert.deepEqual(parseContext({}), {
                internal: false,
                user: null,
                api_key: null,
                member: null,
                public: true,
                integration: null
            });
        });

        it('should return public for random context', function () {
            assert.deepEqual(parseContext('public'), {
                internal: false,
                user: null,
                api_key: null,
                member: null,
                public: true,
                integration: null
            });
            assert.deepEqual(parseContext({client: 'thing'}), {
                internal: false,
                user: null,
                api_key: null,
                member: null,
                public: true,
                integration: null
            });
        });

        it('should return user if user populated', function () {
            assert.deepEqual(parseContext({user: 1}), {
                internal: false,
                user: 1,
                api_key: null,
                member: null,
                public: false,
                integration: null
            });
        });

        it('should return api_key and public context if content api_key provided', function () {
            assert.deepEqual(parseContext({api_key: {
                id: 1,
                type: 'content'
            }, integration: {id: 2}}), {
                internal: false,
                user: null,
                api_key: {
                    id: 1,
                    type: 'content'
                },
                member: null,
                public: true,
                integration: {id: 2}
            });
        });

        it('should return api_key and non public context if admin api_key provided', function () {
            assert.deepEqual(parseContext({api_key: {
                id: 1,
                type: 'admin'
            }, integration: {id: 3}}), {
                internal: false,
                user: null,
                api_key: {
                    id: 1,
                    type: 'admin'
                },
                member: null,
                public: false,
                integration: {id: 3}
            });
        });

        it('should return both user and api_key when both provided (staff API key scenario)', function () {
            assert.deepEqual(parseContext({
                user: {id: 1},
                api_key: {
                    id: 2,
                    type: 'admin'
                },
                integration: {id: 3}
            }), {
                internal: false,
                user: {id: 1},
                api_key: {
                    id: 2,
                    type: 'admin'
                },
                member: null,
                public: false,
                integration: {id: 3}
            });
        });

        it('should return internal if internal provided', function () {
            assert.deepEqual(parseContext({internal: true}), {
                internal: true,
                user: null,
                api_key: null,
                member: null,
                public: false,
                integration: null
            });

            assert.deepEqual(parseContext('internal'), {
                internal: true,
                user: null,
                api_key: null,
                member: null,
                public: false,
                integration: null
            });
        });
    });
});
