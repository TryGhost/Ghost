const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const config = require('../../../../../server/config');
const common = require('../../../../../server/lib/common');
const ghost = testUtils.startGhost;

let request;

describe('Slack API', function () {
    let ghostServer;

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
    after(function () {
        sinon.restore();
    });

    it('Can post slack test', function (done) {
        const eventSpy = sinon.spy(common.events, 'emit');
        request.post(localUtils.API.getApiQuery('slack/test/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                eventSpy.calledWith('slack.test').should.be.true();
                done();
            });
    });
});
