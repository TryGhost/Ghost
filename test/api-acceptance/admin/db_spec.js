const path = require('path');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const config = require('../../../core/server/config');
const common = require('../../../core/server/lib/common');
const testUtils = require('../../utils');
const localUtils = require('./utils');

let ghost = testUtils.startGhost;
let request;
let eventsTriggered;

describe('DB API', function () {
    let backupClient;
    let schedulerClient;

    before(function () {
        return ghost()
            .then(() => {
                request = supertest.agent(config.get('url'));
            })
            .then(() => {
                return localUtils.doAuth(request);
            });
    });

    beforeEach(function () {
        eventsTriggered = {};

        sinon.stub(common.events, 'emit').callsFake((eventName, eventObj) => {
            if (!eventsTriggered[eventName]) {
                eventsTriggered[eventName] = [];
            }

            eventsTriggered[eventName].push(eventObj);
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Can export a JSON database', function () {
        return request.get(localUtils.API.getApiQuery(`db/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .expect('Content-Disposition', /Attachment; filename="[A-Za-z0-9._-]+\.json"/)
            .then((res) => {
                should.not.exist(res.headers['x-cache-invalidate']);
                should.exist(res.headers['content-disposition']);

                const jsonResponse = res.body;
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);
                Object.keys(jsonResponse.db[0].data).length.should.eql(30);
            });
    });

    it('Can import a JSON database', function () {
        return Promise.resolve()
            .then(() => {
                return request.delete(localUtils.API.getApiQuery('db/'))
                    .set('Origin', config.get('url'))
                    .set('Accept', 'application/json')
                    .expect(204);
            })
            .then(() => {
                return request.post(localUtils.API.getApiQuery('db/'))
                    .set('Origin', config.get('url'))
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .attach('importfile', path.join(__dirname, '/../../utils/fixtures/export/default_export.json'))
                    .expect(200)
                    .then((res) => {
                        const jsonResponse = res.body;
                        should.exist(jsonResponse.db);
                        should.exist(jsonResponse.problems);
                        jsonResponse.problems.should.have.length(3);
                    });
            })
            .then(() => {
                return request.get(localUtils.API.getApiQuery('posts/'))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then((res) => {
                        let jsonResponse = res.body;
                        jsonResponse.posts.should.have.length(7);
                    });
            });
    });

    it('Can delete all content', function () {
        return request
            .get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                let jsonResponse = res.body;
                jsonResponse.posts.should.have.length(7);
            })
            .then(() => {
                return request.delete(localUtils.API.getApiQuery('db/'))
                    .set('Origin', config.get('url'))
                    .set('Accept', 'application/json')
                    .expect(204);
            })
            .then(() => {
                return request.get(localUtils.API.getApiQuery('posts/'))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .then((res) => {
                        res.body.posts.should.have.length(0);
                        eventsTriggered['post.unpublished'].length.should.eql(7);
                        eventsTriggered['post.deleted'].length.should.eql(7);
                        eventsTriggered['tag.deleted'].length.should.eql(1);
                    });
            });
    });
});
