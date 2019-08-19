const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const path = require('path');
const testUtils = require('../../../utils/index');
const localUtils = require('./utils');
const config = require('../../../../server/config/index');
const labs = require('../../../../server/services/labs');

const ghost = testUtils.startGhost;

let request;

describe('Subscribers API', function () {
    let accesstoken = '', ghostServer;

    before(function () {
        sinon.stub(labs, 'isSet').withArgs('subscribers').returns(true);
    });

    after(function () {
        sinon.restore();
    });

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'subscriber');
            })
            .then(function (token) {
                accesstoken = token;
            });
    });

    it('browse', function () {
        return request
            .get(localUtils.API.getApiQuery('subscribers/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.subscribers);
                jsonResponse.subscribers.should.have.length(1);
                localUtils.API.checkResponse(jsonResponse.subscribers[0], 'subscriber');

                testUtils.API.isISO8601(jsonResponse.subscribers[0].created_at).should.be.true();
                jsonResponse.subscribers[0].created_at.should.be.an.instanceof(String);

                jsonResponse.meta.pagination.should.have.property('page', 1);
                jsonResponse.meta.pagination.should.have.property('limit', 15);
                jsonResponse.meta.pagination.should.have.property('pages', 1);
                jsonResponse.meta.pagination.should.have.property('total', 1);
                jsonResponse.meta.pagination.should.have.property('next', null);
                jsonResponse.meta.pagination.should.have.property('prev', null);
            });
    });

    it('read', function () {
        return request
            .get(localUtils.API.getApiQuery(`subscribers/${testUtils.DataGenerator.Content.subscribers[0].id}/`))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.subscribers);
                jsonResponse.subscribers.should.have.length(1);
                localUtils.API.checkResponse(jsonResponse.subscribers[0], 'subscriber');
            });
    });

    it('add', function () {
        const subscriber = {
            name: 'test',
            email: 'subscriberTestAdd@test.com'
        };

        return request
            .post(localUtils.API.getApiQuery(`subscribers/`))
            .send({subscribers: [subscriber]})
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.subscribers);
                jsonResponse.subscribers.should.have.length(1);
                // localUtils.API.checkResponse(jsonResponse.subscribers[0], 'subscriber'); // TODO: modify checked schema
                jsonResponse.subscribers[0].name.should.equal(subscriber.name);
                jsonResponse.subscribers[0].email.should.equal(subscriber.email);
            });
    });

    it('edit by id', function () {
        const subscriberToChange = {
            name: 'changed',
            email: 'subscriber1Changed@test.com'
        };

        const subscriberChanged = {
            name: 'changed',
            email: 'subscriber1Changed@test.com'
        };

        return request
            .post(localUtils.API.getApiQuery(`subscribers/`))
            .send({subscribers: [subscriberToChange]})
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.subscribers);
                jsonResponse.subscribers.should.have.length(1);

                return jsonResponse.subscribers[0];
            })
            .then((newSubscriber) => {
                return request
                    .put(localUtils.API.getApiQuery(`subscribers/${newSubscriber.id}/`))
                    .send({subscribers: [subscriberChanged]})
                    .set('Authorization', 'Bearer ' + accesstoken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then((res) => {
                        should.not.exist(res.headers['x-cache-invalidate']);

                        const jsonResponse = res.body;

                        should.exist(jsonResponse);
                        should.exist(jsonResponse.subscribers);
                        jsonResponse.subscribers.should.have.length(1);
                        localUtils.API.checkResponse(jsonResponse.subscribers[0], 'subscriber');
                        jsonResponse.subscribers[0].name.should.equal(subscriberChanged.name);
                        jsonResponse.subscribers[0].email.should.equal(subscriberChanged.email);
                    });
            });
    });

    it('destroy', function () {
        const subscriber = {
            name: 'test',
            email: 'subscriberTestDestroy@test.com'
        };

        return request
            .post(localUtils.API.getApiQuery(`subscribers/`))
            .send({subscribers: [subscriber]})
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);

                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.subscribers);

                return jsonResponse.subscribers[0];
            })
            .then((newSubscriber) => {
                return request
                    .delete(localUtils.API.getApiQuery(`subscribers/${newSubscriber.id}`))
                    .set('Authorization', 'Bearer ' + accesstoken)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(204)
                    .then(() => newSubscriber);
            })
            .then((newSubscriber) => {
                return request
                    .get(localUtils.API.getApiQuery(`subscribers/${newSubscriber.id}/`))
                    .set('Authorization', 'Bearer ' + accesstoken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404);
            });
    });

    it('exportCSV', function () {
        return request
            .get(localUtils.API.getApiQuery(`subscribers/csv/`))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /text\/csv/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);

                res.text.should.match(/id,email,created_at,deleted_at/);
                res.text.should.match(/subscriber1@test.com/);
            });
    });

    it('importCSV', function () {
        return request
            .post(localUtils.API.getApiQuery(`subscribers/csv/`))
            .attach('subscribersfile', path.join(__dirname, '/../../../utils/fixtures/csv/single-column-with-header.csv'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.meta);
                should.exist(jsonResponse.meta.stats);

                jsonResponse.meta.stats.imported.should.equal(2);
                jsonResponse.meta.stats.duplicates.should.equal(0);
                jsonResponse.meta.stats.invalid.should.equal(0);
            });
    });
});
