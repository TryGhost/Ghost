const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const config = require('../../../core/shared/config');
const events = require('../../../core/server/lib/common/events');
const testUtils = require('../../utils');
const {exportedBodyLatest} = require('../../utils/fixtures/export/body-generator');
const localUtils = require('./utils');

describe('DB API', function () {
    let request;
    let eventsTriggered;

    before(async function () {
        await localUtils.startGhost();
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

        const dataKeys = Object.keys(exportedBodyLatest().db[0].data).sort();

        // NOTE: using `Object.keys` here instead of `should.have.only.keys` assertion
        //       because when `have.only.keys` fails there's no useful diff
        Object.keys(jsonResponse.db[0].data).sort().should.be.eql(dataKeys);
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

        const deleteRequest = await request.delete(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect(204);
        should.exist(deleteRequest.headers['x-cache-invalidate']);

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

    it('Can trigger external media inliner', async function () {
        const response = await request
            .post(localUtils.API.getApiQuery('db/media/inline'))
            .send({
                domains: ['https://example.com']
            })
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect(200);

        // @NOTE: the response format is temporary for test purposes
        //        before feature graduates to GA, it should become
        //        a more consistent format
        response.body.should.eql({
            db: [{
                status: 'success'
            }]
        });
    });
});
