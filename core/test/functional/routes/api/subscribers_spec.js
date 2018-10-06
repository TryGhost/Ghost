const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../../utils');
const configUtils = require('../../../utils/configUtils');
const localUtils = require('./utils');
const config = require('../../../../../core/server/config');
const labs = require('../../../../../core/server/services/labs');
const ghost = testUtils.startGhost;
const sandbox = sinon.sandbox.create();
let request;

describe('Subscribers API', function () {
    let accesstoken = '', ghostServer;

    before(function () {
        sandbox.stub(labs, 'isSet').withArgs('subscribers').returns(true);
    });

    after(function () {
        sandbox.restore();
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
                testUtils.API.checkResponse(jsonResponse.subscribers[0], 'subscriber');

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
                testUtils.API.checkResponse(jsonResponse.subscribers[0], 'subscriber');
            });
    });
});
