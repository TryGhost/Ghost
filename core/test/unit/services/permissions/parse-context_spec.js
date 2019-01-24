var should = require('should'),
    parseContext = require('../../../../server/services/permissions/parse-context');

describe('Permissions', function () {
    describe('parseContext', function () {
        it('should return public for no context', function () {
            parseContext().should.eql({
                internal: false,
                external: false,
                user: null,
                api_key: null,
                app: null,
                public: true
            });
            parseContext({}).should.eql({
                internal: false,
                external: false,
                user: null,
                api_key: null,
                app: null,
                public: true
            });
        });

        it('should return public for random context', function () {
            parseContext('public').should.eql({
                internal: false,
                external: false,
                user: null,
                api_key: null,
                app: null,
                public: true
            });
            parseContext({client: 'thing'}).should.eql({
                internal: false,
                external: false,
                user: null,
                api_key: null,
                app: null,
                public: true
            });
        });

        it('should return user if user populated', function () {
            parseContext({user: 1}).should.eql({
                internal: false,
                external: false,
                user: 1,
                api_key: null,
                app: null,
                public: false
            });
        });

        it('should return api_key and public context if content api_key provided', function () {
            parseContext({api_key: {
                id: 1,
                type: 'content'
            }}).should.eql({
                internal: false,
                external: false,
                user: null,
                api_key: {
                    id: 1,
                    type: 'content'
                },
                app: null,
                public: true
            });
        });

        it('should return api_key and non public context if admin api_key provided', function () {
            parseContext({api_key: {
                id: 1,
                type: 'admin'
            }}).should.eql({
                internal: false,
                external: false,
                user: null,
                api_key: {
                    id: 1,
                    type: 'admin'
                },
                app: null,
                public: false
            });
        });

        it('should return app if app populated', function () {
            parseContext({app: 5}).should.eql({
                internal: false,
                external: false,
                user: null,
                api_key: null,
                app: 5,
                public: false
            });
        });

        it('should return internal if internal provided', function () {
            parseContext({internal: true}).should.eql({
                internal: true,
                external: false,
                user: null,
                api_key: null,
                app: null,
                public: false
            });

            parseContext('internal').should.eql({
                internal: true,
                external: false,
                user: null,
                api_key: null,
                app: null,
                public: false
            });
        });

        it('should return external if external provided', function () {
            parseContext({external: true}).should.eql({
                internal: false,
                external: true,
                user: null,
                api_key: null,
                app: null,
                public: false
            });

            parseContext('external').should.eql({
                internal: false,
                external: true,
                user: null,
                api_key: null,
                app: null,
                public: false
            });
        });
    });
});
