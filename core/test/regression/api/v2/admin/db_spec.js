const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const config = require('../../../../../server/config');
const models = require('../../../../../server/models');
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

    it('can export the database with more tables', () => {
        return request.get(localUtils.API.getApiQuery('db/?include=clients,client_trusted_domains'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect(200)
            .then((res) => {
                const jsonResponse = res.body;
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);
                Object.keys(jsonResponse.db[0].data).length.should.eql(28);
            });
    });

    it('import should fail without file', () => {
        return request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(422);
    });

    it('import should fail with unsupported file', () => {
        return request.post(localUtils.API.getApiQuery('db/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .attach('importfile', path.join(__dirname, '/../../../../utils/fixtures/csv/single-column-with-header.csv'))
            .expect(415);
    });

    it('export can be triggered by backup client', () => {
        const backupQuery = `?client_id=${backupClient.slug}&client_secret=${backupClient.secret}&filename=test`;
        const fsStub = sinon.stub(fs, 'writeFile').resolves();

        return request.post(localUtils.API.getApiQuery(`db/backup${backupQuery}`))
            .expect('Content-Type', /json/)
            .expect(200)
            .then((res) => {
                res.body.should.be.Object();
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
                res.body.errors[0].type.should.eql('NoPermissionError');
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
                res.body.errors[0].type.should.eql('UnauthorizedError');
                fsStub.called.should.eql(false);
            });
    });
});
