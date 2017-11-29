var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils'),
    config = require('../../../../../core/server/config'),
    ghost = testUtils.startGhost,
    request;

describe('Webhooks API', function () {
    var ghostServer;

    describe('As Owner', function () {
        var ownerAccessToken = '';

        before(function () {
            return ghost().then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
                .then(function () {
                    return testUtils.doAuth(request);
                })
                .then(function (token) {
                    ownerAccessToken = token;
                });
        });

        describe('Add', function () {
            var newWebhook = {
                event: 'test.create',
                target_url: 'http://example.com/webhooks/test/1'
            };

            it('creates a new webhook', function (done) {
                request.post(testUtils.API.getApiQuery('webhooks/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .send({webhooks: [newWebhook]})
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(201)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body;

                        should.exist(jsonResponse.webhooks);

                        testUtils.API.checkResponse(jsonResponse.webhooks[0], 'webhook');

                        jsonResponse.webhooks[0].event.should.equal(newWebhook.event);
                        jsonResponse.webhooks[0].target_url.should.equal(newWebhook.target_url);

                        done();
                    });
            });
        });

        describe('Delete', function () {
            var newWebhook = {
                event: 'test.create',
                // a different target_url from above is needed to avoid an "already exists" error
                target_url: 'http://example.com/webhooks/test/2'
            };

            it('deletes a webhook', function (done) {
                // create the webhook that is to be deleted
                request.post(testUtils.API.getApiQuery('webhooks/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .send({webhooks: [newWebhook]})
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(201)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var location = res.headers.location;
                        var jsonResponse = res.body;

                        should.exist(jsonResponse.webhooks);
                        testUtils.API.checkResponse(jsonResponse.webhooks[0], 'webhook');

                        jsonResponse.webhooks[0].event.should.equal(newWebhook.event);
                        jsonResponse.webhooks[0].target_url.should.equal(newWebhook.target_url);

                        // begin delete test
                        request.del(location)
                            .set('Authorization', 'Bearer ' + ownerAccessToken)
                            .expect(204)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                res.body.should.be.empty();

                                done();
                            });
                    });
            });
        });
    });
});
