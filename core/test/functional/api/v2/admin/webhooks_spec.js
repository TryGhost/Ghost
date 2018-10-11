const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const config = require('../../../../../../core/server/config');
const ghost = testUtils.startGhost;
let request;

describe('Webhooks API', function () {
    var ghostServer;

    describe('As Owner', function () {
        var ownerAccessToken = '';

        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    return localUtils.doAuth(request);
                });
        });

        describe('Add', function () {
            var newWebhook = {
                event: 'test.create',
                target_url: 'http://example.com/webhooks/test/1'
            };

            it('creates a new webhook', function (done) {
                request.post(localUtils.API.getApiQuery('webhooks/'))
                    .set('Origin', config.get('url'))
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
                request.post(localUtils.API.getApiQuery('webhooks/'))
                    .set('Origin', config.get('url'))
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
                        request.del(localUtils.API.getApiQuery('webhooks/' + jsonResponse.webhooks[0].id + '/'))
                            .set('Origin', config.get('url'))
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
