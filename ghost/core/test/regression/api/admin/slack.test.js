const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const config = require('../../../../core/shared/config');
const events = require('../../../../core/server/lib/common/events');

let request;

describe('Slack API', function () {
    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });
    after(function () {
        sinon.restore();
    });

    it('Can post slack test', function (done) {
        const eventSpy = sinon.spy(events, 'emit');
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
