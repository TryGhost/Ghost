const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;

describe('Email API', function () {
    let request;

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'posts', 'emails');
            });
    });

    it('Can read an email', function () {
        return request
            .get(localUtils.API.getApiQuery(`emails/${testUtils.DataGenerator.Content.emails[0].id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                const jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.emails);
                jsonResponse.emails.should.have.length(1);
                localUtils.API.checkResponse(jsonResponse.emails[0], 'email');

                const stats = JSON.parse(jsonResponse.emails[0].stats);

                should.exist(stats.delivered);
                should.exist(stats.failed);
                should.exist(stats.opened);
                should.exist(stats.clicked);
                should.exist(stats.unsubscribed);
                should.exist(stats.complaints);
            });
    });
});
