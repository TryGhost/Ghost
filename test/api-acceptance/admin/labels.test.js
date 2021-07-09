const path = require('path');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../utils');
const localUtils = require('../../regression/api/canary/admin/utils');
const config = require('../../../core/shared/config');

describe('Labels API', function () {
    let request;

    after(function () {
        sinon.restore();
    });

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    it('Can add', async function () {
        const label = {
            name: 'test'
        };

        const res = await request
            .post(localUtils.API.getApiQuery(`labels/`))
            .send({labels: [label]})
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.labels);

        jsonResponse.labels.should.have.length(1);
        jsonResponse.labels[0].name.should.equal(label.name);
        jsonResponse.labels[0].slug.should.equal(label.name);

        should.exist(res.headers.location);
        res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('labels/')}${res.body.labels[0].id}/`);
    });

    it('Can browse with member count', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('labels/?include=count.members'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.labels);

        jsonResponse.labels.should.have.length(1);
        should.exist(jsonResponse.labels[0].count);
        jsonResponse.labels[0].count.members.should.equal(0);
    });
});
