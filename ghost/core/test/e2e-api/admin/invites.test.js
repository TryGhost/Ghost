const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const mailService = require('../../../core/server/services/mail');
const localUtils = require('./utils');

describe('Invites API', function () {
    let request;

    before(async function () {
        await localUtils.startGhost();
        request = supertest.agent(config.get('url'));
        await localUtils.doAuth(request, 'invites');
    });

    beforeEach(function () {
        sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail is disabled');
    });

    afterEach(function () {
        sinon.restore();
    });

    it('Can fetch all invites', async function () {
        const res = await request.get(localUtils.API.getApiQuery('invites/'))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.invites);
        jsonResponse.invites.should.have.length(2);

        localUtils.API.checkResponse(jsonResponse, 'invites');
        localUtils.API.checkResponse(jsonResponse.invites[0], 'invite');

        jsonResponse.invites[0].status.should.eql('sent');
        jsonResponse.invites[0].email.should.eql('test1@ghost.org');
        jsonResponse.invites[0].role_id.should.eql(testUtils.roles.ids.admin);

        jsonResponse.invites[1].status.should.eql('sent');
        jsonResponse.invites[1].email.should.eql('test2@ghost.org');
        jsonResponse.invites[1].role_id.should.eql(testUtils.roles.ids.author);

        mailService.GhostMailer.prototype.send.called.should.be.false();
    });

    it('Can read an invitation by id', async function () {
        const res = await request.get(localUtils.API.getApiQuery(`invites/${testUtils.DataGenerator.forKnex.invites[0].id}/`))
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.invites);
        jsonResponse.invites.should.have.length(1);

        localUtils.API.checkResponse(jsonResponse.invites[0], 'invite');

        mailService.GhostMailer.prototype.send.called.should.be.false();
    });

    it('Can add a new invite', async function () {
        const res = await request
            .post(localUtils.API.getApiQuery('invites/'))
            .set('Origin', config.get('url'))
            .send({
                invites: [{email: 'test@example.com', role_id: testUtils.getExistingData().roles[1].id}]
            })
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(201);

        should.not.exist(res.headers['x-cache-invalidate']);
        const jsonResponse = res.body;
        should.exist(jsonResponse);
        should.exist(jsonResponse.invites);
        jsonResponse.invites.should.have.length(1);

        localUtils.API.checkResponse(jsonResponse.invites[0], 'invite');
        jsonResponse.invites[0].role_id.should.eql(testUtils.getExistingData().roles[1].id);

        mailService.GhostMailer.prototype.send.called.should.be.true();

        should.exist(res.headers.location);
        res.headers.location.should.equal(`http://127.0.0.1:2369${localUtils.API.getApiQuery('invites/')}${res.body.invites[0].id}/`);
    });

    it('Can destroy an existing invite', async function () {
        await request.del(localUtils.API.getApiQuery(`invites/${testUtils.DataGenerator.forKnex.invites[0].id}/`))
            .set('Origin', config.get('url'))
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(204);

        mailService.GhostMailer.prototype.send.called.should.be.false();
    });
});
