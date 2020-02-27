const path = require('path');
const should = require('should');
const supertest = require('supertest');
const sinon = require('sinon');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const config = require('../../../../../server/config');
const labs = require('../../../../../server/services/labs');

const ghost = testUtils.startGhost;

let request;

describe('Members Sigin URL API', function () {
    before(function () {
        sinon.stub(labs, 'isSet').withArgs('members').returns(true);
    });

    after(function () {
        sinon.restore();
    });

    describe('As Owner', function () {
        before(function () {
            return ghost()
                .then(function () {
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    return localUtils.doAuth(request, 'member');
                });
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

    describe('As non-Owner', function () {
        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({email: 'admin+1@ghost.org'}),
                        role: testUtils.DataGenerator.Content.roles[0].name
                    });
                })
                .then(function (admin) {
                    request.user = admin;

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
