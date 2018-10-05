var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils'),
    localUtils = require('./utils'),
    config = require('../../../../../core/server/config'),
    ghost = testUtils.startGhost,
    request;

describe('Configuration API', function () {
    var accesstoken = '', ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request);
            })
            .then(function (token) {
                accesstoken = token;
            });
    });

    describe('success', function () {
        it('can retrieve public configuration and all expected properties', function (done) {
            request.get(localUtils.API.getApiQuery('configuration/'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.exist(res.body.configuration);

                    res.body.configuration.should.be.an.Array().with.lengthOf(1);
                    const props = res.body.configuration[0];

                    props.blogUrl.should.eql('http://127.0.0.1:2369/');

                    props.useGravatar.should.eql(false);
                    props.publicAPI.should.eql(true);
                    props.clientId.should.eql('ghost-admin');
                    props.clientSecret.should.eql('not_available');

                    // value not available, because settings API was not called yet
                    props.hasOwnProperty('blogTitle').should.eql(true);
                    done();
                });
        });
    });
});
