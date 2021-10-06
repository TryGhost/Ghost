const should = require('should');
const parseContext = require('../../../../../core/server/services/permissions/parse-context');

describe('Permissions', function () {
    describe('parseContext', function () {
        it('should return public for no context', function () {
            parseContext().should.eql({
                internal: false,
                external: false,
                user: null,
                api_key: null,
                public: true,
                integration: null
            });
            parseContext({}).should.eql({
                internal: false,
                external: false,
                user: null,
                api_key: null,
                public: true,
                integration: null
            });
        });

        it('should return public for random context', function () {
            parseContext('public').should.eql({
                internal: false,
                external: false,
                user: null,
                api_key: null,
                public: true,
                integration: null
            });
            parseContext({client: 'thing'}).should.eql({
                internal: false,
                external: false,
                user: null,
                api_key: null,
                public: true,
                integration: null
            });
        });

        it('should return user if user populated', function () {
            parseContext({user: 1}).should.eql({
                internal: false,
                external: false,
                user: 1,
                api_key: null,
                public: false,
                integration: null
            });
        });

        it('should return api_key and public context if content api_key provided', function () {
            parseContext({api_key: {
                id: 1,
                type: 'content'
            }, integration: {id: 2}}).should.eql({
                internal: false,
                external: false,
                user: null,
                api_key: {
                    id: 1,
                    type: 'content'
                },
                public: true,
                integration: {id: 2}
            });
        });

        it('should return api_key and non public context if admin api_key provided', function () {
            parseContext({api_key: {
                id: 1,
                type: 'admin'
            }, integration: {id: 3}}).should.eql({
                internal: false,
                external: false,
                user: null,
                api_key: {
                    id: 1,
                    type: 'admin'
                },
                public: false,
                integration: {id: 3}
            });
        });

        it('should return internal if internal provided', function () {
            parseContext({internal: true}).should.eql({
                internal: true,
                external: false,
                user: null,
                api_key: null,
                public: false,
                integration: null
            });

            parseContext('internal').should.eql({
                internal: true,
                external: false,
                user: null,
                api_key: null,
                public: false,
                integration: null
            });
        });

        it('should return external if external provided', function () {
            parseContext({external: true}).should.eql({
                internal: false,
                external: true,
                user: null,
                api_key: null,
                public: false,
                integration: null
            });

            parseContext('external').should.eql({
                internal: false,
                external: true,
                user: null,
                api_key: null,
                public: false,
                integration: null
            });
        });
    });
});
