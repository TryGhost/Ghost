const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const config = require('../../../../../../core/server/config');
const models = require('../../../../../../core/server/models');
const common = require('../../../../../server/lib/common');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');

let ghost = testUtils.startGhost;
let request;
let eventsTriggered;

describe('DB API', () => {
    let backupClient;
    let schedulerClient;

    before(() => {
        return ghost()
            .then(() => {
                request = supertest.agent(config.get('url'));
            })
            .then(() => {
                return localUtils.doAuth(request);
            })
            .then(() => {
                return models.Client.findAll();
            })
            .then((result) => {
                const clients = result.toJSON();
                backupClient = _.find(clients, {slug: 'ghost-backup'});
                schedulerClient = _.find(clients, {slug: 'ghost-scheduler'});
            });
    });

    beforeEach(() => {
        eventsTriggered = {};

        sinon.stub(common.events, 'emit').callsFake((eventName, eventObj) => {
            if (!eventsTriggered[eventName]) {
                eventsTriggered[eventName] = [];
            }

            eventsTriggered[eventName].push(eventObj);
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should export data', () => {
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
                Object.keys(jsonResponse.db[0].data).length.should.eql(25);
            });
    });

    it('include more tables', () => {
        return request.get(localUtils.API.getApiQuery('db/?include=clients,client_trusted_domains'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);
                Object.keys(jsonResponse.db[0].data).length.should.eql(27);
            });
    });

    it('import should succeed with default content', () => {
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
                    .attach('importfile', path.join(__dirname, '/../../../../utils/fixtures/export/default_export.json'))
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
                        let results = jsonResponse.posts;
                        jsonResponse.posts.should.have.length(7);
                        _.filter(results, {page: false, status: 'published'}).length.should.equal(7);
                    });
            });
    });

    it('import should fail without file', () => {
        return request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(403);
    });

    it('import should fail with unsupported file', () => {
        return request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../../../utils/fixtures/csv/single-column-with-header.csv'))
            .expect(415);
    });

    it('export can be triggered by backup client', () => {
        const backupQuery = `?client_id=${backupClient.slug}&client_secret=${backupClient.secret}`;
        const fsStub = sinon.stub(fs, 'writeFile').resolves();

        return request.post(localUtils.API.getApiQuery(`db/backup${backupQuery}`))
            .expect('Content-Type', /json/)
            .expect(200)
            .then((res) => {
                (typeof res.body).should.be.Object;
                should.exist(res.body.db[0].filename);
                fsStub.calledOnce.should.eql(true);
            });
    });

    it('export can be triggered and named by backup client', () => {
        const backupQuery = `?client_id=${backupClient.slug}&client_secret=${backupClient.secret}&filename=test`;
        const fsStub = sinon.stub(fs, 'writeFile').resolves();

        return request.post(localUtils.API.getApiQuery(`db/backup${backupQuery}`))
            .expect('Content-Type', /json/)
            .expect(200)
            .then((res) => {
                (typeof res.body).should.be.Object;
                res.body.db[0].filename.should.match(/test\.json/);
                fsStub.calledOnce.should.eql(true);
            });
    });

    it('export can not be triggered by client other than backup', () => {
        const schedulerQuery = `?client_id=${schedulerClient.slug}&client_secret=${schedulerClient.secret}`;
        const fsStub = sinon.stub(fs, 'writeFile').resolves();

        return request.post(localUtils.API.getApiQuery(`db/backup${schedulerQuery}`))
            .expect('Content-Type', /json/)
            .expect(403)
            .then(res => {
                should.exist(res.body.errors);
                res.body.errors[0].errorType.should.eql('NoPermissionError');
                fsStub.called.should.eql(false);
            });
    });

    it('export can not be triggered by regular authentication', () => {
        const fsStub = sinon.stub(fs, 'writeFile').resolves();

        return request.post(localUtils.API.getApiQuery(`db/backup`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect(401)
            .then(res => {
                should.exist(res.body.errors);
                res.body.errors[0].errorType.should.eql('UnauthorizedError');
                fsStub.called.should.eql(false);
            });
    });

    it('delete all content (owner)', () => {
        return request.get(localUtils.API.getApiQuery('posts/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then((res) => {
                let jsonResponse = res.body;
                let results = jsonResponse.posts;
                jsonResponse.posts.should.have.length(7);
                _.filter(results, {page: false, status: 'published'}).length.should.equal(7);
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
