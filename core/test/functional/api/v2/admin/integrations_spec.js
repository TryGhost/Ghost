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

    const findKey = type => object => object.type === type;

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
                .expect(200)
                .end(function (err, {body}) {
                    if (err) {
                        return done(err);
                    }

                    should.equal(body.integrations.length, 1);

                    const [integration] = body.integrations;
                    should.equal(integration.name, 'Dis-Integrate!!');

                    should.equal(integration.api_keys.length, 2);

                    const contentApiKey = integration.api_keys.find(findKey('content'));
                    should.equal(contentApiKey.integration_id, integration.id);

                    const adminApiKey = integration.api_keys.find(findKey('admin'));
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
                .expect(200)
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
});

