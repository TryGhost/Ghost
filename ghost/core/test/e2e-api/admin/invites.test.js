const assert = require('node:assert/strict');
const {assertExists} = require('../../utils/assertions');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../utils');
const config = require('../../../core/shared/config');
const mailService = require('../../../core/server/services/mail');
const localUtils = require('./utils');

describe('Invites API', function () {
    let request;

    describe('As Owner', function () {
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

            assert.equal(res.headers['x-cache-invalidate'], undefined);
            const jsonResponse = res.body;
            assertExists(jsonResponse);
            assertExists(jsonResponse.invites);
            assert.equal(jsonResponse.invites.length, 2);

            localUtils.API.checkResponse(jsonResponse, 'invites');
            localUtils.API.checkResponse(jsonResponse.invites[0], 'invite');

            assert.equal(jsonResponse.invites[0].status, 'sent');
            assert.equal(jsonResponse.invites[0].email, 'test1@ghost.org');
            assert.equal(jsonResponse.invites[0].role_id, testUtils.roles.ids.admin);

            assert.equal(jsonResponse.invites[1].status, 'sent');
            assert.equal(jsonResponse.invites[1].email, 'test2@ghost.org');
            assert.equal(jsonResponse.invites[1].role_id, testUtils.roles.ids.author);

            assert.equal(mailService.GhostMailer.prototype.send.called, false);
        });

        it('Can read an invitation by id', async function () {
            const res = await request.get(localUtils.API.getApiQuery(`invites/${testUtils.DataGenerator.forKnex.invites[0].id}/`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200);

            assert.equal(res.headers['x-cache-invalidate'], undefined);
            const jsonResponse = res.body;
            assertExists(jsonResponse);
            assertExists(jsonResponse.invites);
            assert.equal(jsonResponse.invites.length, 1);

            localUtils.API.checkResponse(jsonResponse.invites[0], 'invite');

            assert.equal(mailService.GhostMailer.prototype.send.called, false);
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

            assert.equal(res.headers['x-cache-invalidate'], undefined);
            const jsonResponse = res.body;
            assertExists(jsonResponse);
            assertExists(jsonResponse.invites);
            assert.equal(jsonResponse.invites.length, 1);

            localUtils.API.checkResponse(jsonResponse.invites[0], 'invite');
            assert.equal(jsonResponse.invites[0].role_id, testUtils.getExistingData().roles[1].id);

            assert.equal(mailService.GhostMailer.prototype.send.called, true);

            assertExists(res.headers.location);
            assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/invites/${res.body.invites[0].id}/`);
        });

        it('Can destroy an existing invite', async function () {
            await request.del(localUtils.API.getApiQuery(`invites/${testUtils.DataGenerator.forKnex.invites[0].id}/`))
                .set('Origin', config.get('url'))
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(204);

            assert.equal(mailService.GhostMailer.prototype.send.called, false);
        });

        it('Cannot destroy an non-existent invite', async function () {
            await request.del(localUtils.API.getApiQuery(`invites/abcd1234abcd1234abcd1234/`))
                .set('Origin', config.get('url'))
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect((res) => {
                    assert.equal(res.body.errors[0].message, 'Resource not found error, cannot delete invite.');
                });

            assert.equal(mailService.GhostMailer.prototype.send.called, false);
        });
    });
    
    describe('As Admin Integration', function () {
        before(async function () {
            await localUtils.startGhost();
            request = supertest.agent(config.get('url'));
            await testUtils.initFixtures('api_keys');
        });

        beforeEach(function () {
            sinon.stub(mailService.GhostMailer.prototype, 'send').resolves('Mail is disabled');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('Can add a new invite by API Key with the Author Role', async function () {
            const roleId = testUtils.getExistingData().roles.find(role => role.name === 'Author').id;
            const res = await request
                .post(localUtils.API.getApiQuery('invites/'))
                .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/')}`)
                .send({
                    invites: [{email: 'admin-api-key-test@example.com', role_id: roleId}]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            assert.equal(res.headers['x-cache-invalidate'], undefined);
            const jsonResponse = res.body;
            assertExists(jsonResponse);
            assertExists(jsonResponse.invites);
            assert.equal(jsonResponse.invites.length, 1);

            localUtils.API.checkResponse(jsonResponse.invites[0], 'invite');
            assert.equal(jsonResponse.invites[0].role_id, roleId);

            assert.equal(mailService.GhostMailer.prototype.send.called, true);

            assertExists(res.headers.location);
            assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/invites/${res.body.invites[0].id}/`);
        });

        it('Can add a new invite by API Key with the Editor Role', async function () {
            const roleId = testUtils.getExistingData().roles.find(role => role.name === 'Editor').id;
            const res = await request
                .post(localUtils.API.getApiQuery('invites/'))
                .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/')}`)
                .send({
                    invites: [{email: 'admin-api-key-test@example.com', role_id: roleId}]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            assert.equal(res.headers['x-cache-invalidate'], undefined);
            const jsonResponse = res.body;
            assertExists(jsonResponse);
            assertExists(jsonResponse.invites);
            assert.equal(jsonResponse.invites.length, 1);

            localUtils.API.checkResponse(jsonResponse.invites[0], 'invite');
            assert.equal(jsonResponse.invites[0].role_id, roleId);

            assert.equal(mailService.GhostMailer.prototype.send.called, true);

            assertExists(res.headers.location);
            assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/invites/${res.body.invites[0].id}/`);
        });

        it('Can add a new invite by API Key with the Contributor Role', async function () {
            const roleId = testUtils.getExistingData().roles.find(role => role.name === 'Contributor').id;
            const res = await request
                .post(localUtils.API.getApiQuery('invites/'))
                .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/')}`)
                .send({
                    invites: [{email: 'admin-api-key-test@example.com', role_id: roleId}]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            assert.equal(res.headers['x-cache-invalidate'], undefined);
            const jsonResponse = res.body;
            assertExists(jsonResponse);
            assertExists(jsonResponse.invites);
            assert.equal(jsonResponse.invites.length, 1);

            localUtils.API.checkResponse(jsonResponse.invites[0], 'invite');
            assert.equal(jsonResponse.invites[0].role_id, roleId);

            assert.equal(mailService.GhostMailer.prototype.send.called, true);

            assertExists(res.headers.location);
            assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/invites/${res.body.invites[0].id}/`);
        });

        it('Can add a new invite by API Key with the Super Editor Role', async function () {
            const roleId = testUtils.getExistingData().roles.find(role => role.name === 'Super Editor').id;
            const res = await request
                .post(localUtils.API.getApiQuery('invites/'))
                .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/')}`)
                .send({
                    invites: [{email: 'admin-api-key-test@example.com', role_id: roleId}]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(201);

            assert.equal(res.headers['x-cache-invalidate'], undefined);
            const jsonResponse = res.body;
            assertExists(jsonResponse);
            assertExists(jsonResponse.invites);
            assert.equal(jsonResponse.invites.length, 1);

            localUtils.API.checkResponse(jsonResponse.invites[0], 'invite');
            assert.equal(jsonResponse.invites[0].role_id, roleId);

            assert.equal(mailService.GhostMailer.prototype.send.called, true);

            assertExists(res.headers.location);
            assert.equal(new URL(res.headers.location).pathname, `/ghost/api/admin/invites/${res.body.invites[0].id}/`);
        });

        it('Can not add a new invite by API Key with the Administrator Role', async function () {
            const roleId = testUtils.getExistingData().roles.find(role => role.name === 'Administrator').id;
            await request
                .post(localUtils.API.getApiQuery('invites/'))
                .set('Authorization', `Ghost ${localUtils.getValidAdminToken('/admin/')}`)
                .send({
                    invites: [{email: 'admin-api-key-test@example.com', role_id: roleId}]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403);
        });
    });
});