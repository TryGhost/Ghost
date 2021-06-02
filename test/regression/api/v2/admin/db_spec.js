const path = require('path');
const _ = require('lodash');
const os = require('os');
const fs = require('fs-extra');
const uuid = require('uuid');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const config = require('../../../../../core/shared/config');
const events = require('../../../../../core/server/lib/common/events');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');

let ghost = testUtils.startGhost;
let request;
let eventsTriggered;

describe('DB API', function () {
    let backupKey;
    let schedulerKey;

    before(function () {
        return ghost()
            .then(() => {
                request = supertest.agent(config.get('url'));
            })
            .then(() => {
                return localUtils.doAuth(request);
            })
            .then(() => {
                backupKey = _.find(testUtils.getExistingData().apiKeys, {integration: {slug: 'ghost-backup'}});
                schedulerKey = _.find(testUtils.getExistingData().apiKeys, {integration: {slug: 'ghost-scheduler'}});
            });
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

    it('can export the database with more tables', function () {
        return request.get(localUtils.API.getApiQuery('db/?include=mobiledoc_revisions'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);

                // NOTE: 10 default tables + 1 from include parameters
                Object.keys(jsonResponse.db[0].data).length.should.eql(11);
            });
    });

    it('can export & import', function () {
        const exportFolder = path.join(os.tmpdir(), uuid.v4());
        const exportPath = path.join(exportFolder, 'export.json');

        return request.put(localUtils.API.getApiQuery('settings/'))
            .set('Origin', config.get('url'))
            .send({
                settings: [
                    {
                        key: 'is_private',
                        value: true
                    }
                ]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then(() => {
                return request.get(localUtils.API.getApiQuery('db/'))
                    .set('Origin', config.get('url'))
                    .expect('Content-Type', /json/)
                    .expect(200);
            })
            .then((res) => {
                const jsonResponse = res.body;
                should.exist(jsonResponse.db);

                fs.ensureDirSync(exportFolder);
                fs.writeJSONSync(exportPath, jsonResponse);

                return request.post(localUtils.API.getApiQuery('db/'))
                    .set('Origin', config.get('url'))
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .attach('importfile', exportPath)
                    .expect(200);
            })
            .then((res) => {
                res.body.problems.length.should.eql(3);
                fs.removeSync(exportFolder);
            });
    });

    it('import should fail without file', function () {
        return request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(422);
    });

    it('import should fail with unsupported file', function () {
        return request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../../../utils/fixtures/csv/single-column-with-header.csv'))
            .expect(415);
    });

    it('export can be triggered by backup integration', function () {
        const backupQuery = `?filename=test`;
        const fsStub = sinon.stub(fs, 'writeFile').resolves();

        return request.post(localUtils.API.getApiQuery(`db/backup${backupQuery}`))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/v2/admin/', backupKey)}`)
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect(200)
            .then((res) => {
                res.body.should.be.Object();
                res.body.db[0].filename.should.match(/test\.json/);
                fsStub.calledOnce.should.eql(true);
            });
    });

    it('export can not be triggered by integration other than backup', function () {
        const fsStub = sinon.stub(fs, 'writeFile').resolves();

        return request.post(localUtils.API.getApiQuery(`db/backup`))
            .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/v2/admin/', schedulerKey)}`)
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect(403)
            .then((res) => {
                should.exist(res.body.errors);
                res.body.errors[0].type.should.eql('NoPermissionError');
                fsStub.called.should.eql(false);
            });
    });

    it('export can be triggered by Admin authentication', function () {
        const fsStub = sinon.stub(fs, 'writeFile').resolves();

        return request.post(localUtils.API.getApiQuery(`db/backup`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect(200);
    });
});
