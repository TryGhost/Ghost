const path = require('path');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const config = require('../../../core/shared/config');
const {events} = require('../../../core/server/lib/common');
const testUtils = require('../../utils');
const localUtils = require('./utils');

describe('DB API', function () {
    let request;
    let eventsTriggered;

    before(async function () {
        await testUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request);
    });

    beforeEach(function () {
        eventsTriggered = {};

        sinon.stub(events, 'emit').callsFake((eventName, eventObj) => {
            if (!eventsTriggered[eventName]) {
                eventsTriggered[eventName] = [];
            }

            eventsTriggered[eventName].push(eventObj);
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Can export a JSON database', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`db/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .expect('Content-Disposition', /Attachment; filename="[A-Za-z0-9._-]+\.json"/);

        should.not.exist(res.headers['x-cache-invalidate']);
        should.exist(res.headers['content-disposition']);

        const jsonResponse = res.body;
        should.exist(jsonResponse.db);
        jsonResponse.db.should.have.length(1);
        Object.keys(jsonResponse.db[0].data).length.should.eql(28);
    });

    it('Can import a JSON database exported from Ghost v2', async function () {
        await request.delete(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect(204);

        const res = await request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../utils/fixtures/export/v2_export.json'))
            .expect(200);

        const jsonResponse = res.body;
        should.exist(jsonResponse.db);
        should.exist(jsonResponse.problems);
        jsonResponse.problems.should.have.length(3);

        const res2 = await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        res2.body.posts.should.have.length(7);
    });

    it('Can import a JSON database exported from Ghost v3', async function () {
        await request.delete(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect(204);

        const res = await request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../utils/fixtures/export/v3_export.json'))
            .expect(200);

        const jsonResponse = res.body;
        should.exist(jsonResponse.db);
        should.exist(jsonResponse.problems);
        jsonResponse.problems.should.have.length(3);

        const res2 = await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        res2.body.posts.should.have.length(7);
    });

    it('Can import a JSON database exported from Ghost v4', async function () {
        await request.delete(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect(204);

        const res = await request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../utils/fixtures/export/v4_export.json'))
            .expect(200);

        const jsonResponse = res.body;
        should.exist(jsonResponse.db);
        should.exist(jsonResponse.problems);
        jsonResponse.problems.should.have.length(3);

        const res2 = await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        res2.body.posts.should.have.length(7);
    });

    it('Can delete all content', async function () {
        const res = await request
            .get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        let jsonResponse = res.body;
        jsonResponse.posts.should.have.length(7);

        await request.delete(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect(204);

        const res2 = await request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        res2.body.posts.should.have.length(0);
        eventsTriggered['post.unpublished'].length.should.eql(7);
        eventsTriggered['post.deleted'].length.should.eql(7);
        eventsTriggered['tag.deleted'].length.should.eql(1);
    });
});
