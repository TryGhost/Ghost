const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const config = require('../../../../core/shared/config');

const {mockManager} = require('../../../utils/e2e-framework');

let request;

describe('Members Sigin URL API', function () {
    afterEach(function () {
        mockManager.restore();
    });

    describe('As Owner', function () {
        before(async function () {
            await localUtils.startGhost();
            request = supertest.agent(config.get('url'));
            await localUtils.doAuth(request, 'member');
        });

        it('Can read', function () {
            return request
                .get(localUtils.API.getApiQuery(`members/${testUtils.DataGenerator.Content.members[0].id}/signin_urls/`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.member_signin_urls);
                    jsonResponse.member_signin_urls.should.have.length(1);
                    localUtils.API.checkResponse(jsonResponse.member_signin_urls[0], 'member_signin_url');
                });
        });
    });

    describe('As Admin', function () {
        before(async function () {
            await localUtils.startGhost();
            request = supertest.agent(config.get('url'));
            const admin = await testUtils.createUser({
                user: testUtils.DataGenerator.forKnex.createUser({email: 'admin+1@ghost.org'}),
                role: testUtils.DataGenerator.Content.roles[0].name
            });

            request.user = admin;
            await localUtils.doAuth(request, 'member');
        });

        it('Can read', function () {
            return request
                .get(localUtils.API.getApiQuery(`members/${testUtils.DataGenerator.Content.members[0].id}/signin_urls/`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.member_signin_urls);
                    jsonResponse.member_signin_urls.should.have.length(1);
                    localUtils.API.checkResponse(jsonResponse.member_signin_urls[0], 'member_signin_url');
                });
        });
    });

    describe('As non-Owner and non-Admin', function () {
        before(function () {
            return localUtils.startGhost()
                .then(function () {
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({
                            email: 'test+editor@ghost.org'
                        }),
                        role: testUtils.DataGenerator.Content.roles[1].name
                    });
                })
                .then((user) => {
                    request.user = user;

                    return localUtils.doAuth(request, 'member');
                });
        });

        it('Cannot read', function () {
            return request
                .get(localUtils.API.getApiQuery(`members/${testUtils.DataGenerator.Content.members[0].id}/signin_urls/`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403);
        });
    });
});
