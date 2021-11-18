const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const localUtils = require('./utils');

describe('Email API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'posts', 'emails');
    });

    it('Can read an email', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery(`emails/${testUtils.DataGenerator.Content.emails[0].id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.emails);
        jsonResponse.emails.should.have.length(1);
        localUtils.API.checkResponse(jsonResponse.emails[0], 'email');
    });
});
