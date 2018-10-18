const should = require('should');
const supertest = require('supertest');
const config = require('../../../../../../core/server/config');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;

describe('Integrations API', function () {
    let request;

    before(function () {
        return ghost()
            .then(() => {
                request = supertest.agent(config.get('url'));
            })
            .then(() => {
                return localUtils.doAuth(request, 'integrations');
            });
    });

    const findBy = (prop, val) => object => object[prop] === val;

    describe('POST /integrations/', function () {
        it('Can successfully create a single integration with auto generated content and admin api key', function (done) {
            request.post(localUtils.API.getApiQuery('integrations/'))
                .set('Origin', config.get('url'))
                .send({
                    integrations: [{
                        name: 'Dis-Integrate!!'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .end(function (err, {body}) {
                    if (err) {
                        return done(err);
                    }

                    should.equal(body.integrations.length, 1);

                    const [integration] = body.integrations;
                    should.equal(integration.name, 'Dis-Integrate!!');

                    should.equal(integration.api_keys.length, 2);

                    const contentApiKey = integration.api_keys.find(findBy('type', 'content'));
                    should.equal(contentApiKey.integration_id, integration.id);

                    const adminApiKey = integration.api_keys.find(findBy('type', 'admin'));
                    should.equal(adminApiKey.integration_id, integration.id);

                    done();
                });
        });

        it('Can successfully create a single integration with a webhook', function (done) {
            request.post(localUtils.API.getApiQuery('integrations/'))
                .set('Origin', config.get('url'))
                .send({
                    integrations: [{
                        name: 'Integratatron4000',
                        webhooks: [{
                            event: 'something',
                            target_url: 'http://example.com',
                        }]
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201)
                .end(function (err, {body}) {
                    if (err) {
                        return done(err);
                    }

                    should.equal(body.integrations.length, 1);

                    const [integration] = body.integrations;
                    should.equal(integration.name, 'Integratatron4000');

                    should.equal(integration.webhooks.length, 1);

                    const webhook = integration.webhooks[0];
                    should.equal(webhook.integration_id, integration.id);

                    done();
                });
        });
    });

    describe('GET /integrations/:id', function () {
        it('Can successfully get a created integration', function (done) {
            request.post(localUtils.API.getApiQuery('integrations/'))
                .set('Origin', config.get('url'))
                .send({
                    integrations: [{
                        name: 'Interrogation Integration'
                    }]
                })
                .expect(201)
                .end(function (err, {body}) {
                    if (err) {
                        return done(err);
                    }
                    const [createdIntegration] = body.integrations;

                    request.get(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
                        .set('Origin', config.get('url'))
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(200)
                        .end(function (err, {body}) {
                            if (err) {
                                return done(err);
                            }

                            should.equal(body.integrations.length, 1);

                            const [integration] = body.integrations;

                            should.equal(integration.id, createdIntegration.id);
                            should.equal(integration.name, createdIntegration.name);
                            should.equal(integration.slug, createdIntegration.slug);
                            should.equal(integration.description, createdIntegration.description);
                            should.equal(integration.icon_image, createdIntegration.icon_image);
                            done();
                        });
                });
        });

        it('Will 404 if the integration does not exist', function (done) {
            request.get(localUtils.API.getApiQuery(`integrations/012345678901234567890123/`))
                .set('Origin', config.get('url'))
                .expect(404)
                .end(done);
        });
    });

    describe('GET /integrations/', function () {
        it('Can successfully get *all* created integrations with api_keys', function (done) {
            request.post(localUtils.API.getApiQuery('integrations/'))
                .set('Origin', config.get('url'))
                .send({
                    integrations: [{
                        name: 'Integrate with this!'
                    }]
                })
                .expect(201)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }
                    request.post(localUtils.API.getApiQuery('integrations/'))
                        .set('Origin', config.get('url'))
                        .send({
                            integrations: [{
                                name: 'Winter-(is)-great'
                            }]
                        })
                        .expect(201)
                        .end(function (err) {
                            if (err) {
                                return done(err);
                            }

                            request.get(localUtils.API.getApiQuery(`integrations/?include=api_keys&limit=all`))
                                .set('Origin', config.get('url'))
                                .expect('Content-Type', /json/)
                                .expect('Cache-Control', testUtils.cacheRules.private)
                                .expect(200)
                                .end(function (err, {body}) {
                                    if (err) {
                                        return done(err);
                                    }

                                    // This is the only page
                                    should.equal(body.meta.pagination.page, 1);
                                    should.equal(body.meta.pagination.pages, 1);
                                    should.equal(body.meta.pagination.next, null);
                                    should.equal(body.meta.pagination.prev, null);

                                    body.integrations.forEach(integration => {
                                        should.exist(integration.api_keys);
                                    });

                                    done();
                                });
                        });
                });
        });
    });

    describe('PUT /integrations/:id', function () {
        it('Can successfully edit a created integration', function (done) {
            request.post(localUtils.API.getApiQuery('integrations/'))
                .set('Origin', config.get('url'))
                .send({
                    integrations: [{
                        name: 'Rubbish Integration Name'
                    }]
                })
                .expect(201)
                .end(function (err, {body}) {
                    if (err) {
                        return done(err);
                    }
                    const [createdIntegration] = body.integrations;
                    request.put(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
                        .set('Origin', config.get('url'))
                        .send({
                            integrations: [{
                                name: 'Awesome Integration Name',
                                description: 'Finally got round to writing this...'
                            }]
                        })
                        .expect(200)
                        .end(function (err) {
                            if (err) {
                                return done(err);
                            }

                            request.get(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
                                .set('Origin', config.get('url'))
                                .expect('Content-Type', /json/)
                                .expect('Cache-Control', testUtils.cacheRules.private)
                                .expect(200)
                                .end(function (err, {body}) {
                                    if (err) {
                                        return done(err);
                                    }

                                    const [updatedIntegration] = body.integrations;

                                    should.equal(updatedIntegration.id, createdIntegration.id);
                                    should.equal(updatedIntegration.name, 'Awesome Integration Name');
                                    should.equal(updatedIntegration.description, 'Finally got round to writing this...');
                                    done();
                                });
                        });
                });
        });

        it('Can successfully add and delete a created integrations webhooks', function (done) {
            request.post(localUtils.API.getApiQuery('integrations/'))
                .set('Origin', config.get('url'))
                .send({
                    integrations: [{
                        name: 'Webhook-less Integration',
                    }]
                })
                .expect(201)
                .end(function (err, {body}) {
                    if (err) {
                        return done(err);
                    }
                    const [createdIntegration] = body.integrations;
                    request.put(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
                        .set('Origin', config.get('url'))
                        .send({
                            integrations: [{
                                webhooks: [{
                                    event: 'somestuff',
                                    target_url: 'http://example.com'
                                }]
                            }]
                        })
                        .expect(200)
                        .end(function (err) {
                            if (err) {
                                return done(err);
                            }

                            request.get(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/?include=webhooks`))
                                .set('Origin', config.get('url'))
                                .expect('Content-Type', /json/)
                                .expect('Cache-Control', testUtils.cacheRules.private)
                                .expect(200)
                                .end(function (err, {body}) {
                                    if (err) {
                                        return done(err);
                                    }

                                    const [updatedIntegration] = body.integrations;

                                    should.equal(updatedIntegration.webhooks.length, 1);

                                    const webhook = updatedIntegration.webhooks[0];
                                    should.equal(webhook.integration_id, updatedIntegration.id);

                                    request.put(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
                                        .set('Origin', config.get('url'))
                                        .send({
                                            integrations: [{
                                                webhooks: []
                                            }]
                                        })
                                        .expect(200)
                                        .end(function (err) {
                                            if (err) {
                                                return done(err);
                                            }

                                            request.get(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/?include=webhooks`))
                                                .set('Origin', config.get('url'))
                                                .expect('Content-Type', /json/)
                                                .expect('Cache-Control', testUtils.cacheRules.private)
                                                .expect(200)
                                                .end(function (err, {body}) {
                                                    if (err) {
                                                        return done(err);
                                                    }

                                                    const [updatedIntegration] = body.integrations;

                                                    should.equal(updatedIntegration.webhooks.length, 0);
                                                    done();
                                                });
                                        });
                                });
                        });
                });
        });

        it('Will 404 if the integration does not exist', function (done) {
            request.put(localUtils.API.getApiQuery(`integrations/012345678901234567890123/`))
                .set('Origin', config.get('url'))
                .send({
                    integrations: [{
                        name: 'This better not work'
                    }]
                })
                .expect(404)
                .end(done);
        });
    });

    describe('DELETE /integrations/:id', function () {
        it('Can succesfully delete a created integration', function (done) {
            request.post(localUtils.API.getApiQuery('integrations/'))
                .set('Origin', config.get('url'))
                .send({
                    integrations: [{
                        name: 'Short Lived Integration'
                    }]
                })
                .expect(201)
                .end(function (err, {body}) {
                    if (err) {
                        return done(err);
                    }
                    const [createdIntegration] = body.integrations;

                    request.del(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
                        .set('Origin', config.get('url'))
                        .expect(204)
                        .end(function (err) {
                            if (err) {
                                return done(err);
                            }

                            request.get(localUtils.API.getApiQuery(`integrations/${createdIntegration.id}/`))
                                .set('Origin', config.get('url'))
                                .expect(404)
                                .end(done);
                        });
                });
        });

        it('Will 404 if the integration does not exist', function (done) {
            request.del(localUtils.API.getApiQuery(`integrations/012345678901234567890123/`))
                .set('Origin', config.get('url'))
                .expect(404)
                .end(done);
        });

        it('Will delete the associated api_keys and webhooks', function () {
            /**
             * @TODO
             *
             * We do not have the /apikeys or /webhooks endpoints yet
             * This will be manually tested by egg before merging
             */
        });
    });
});
