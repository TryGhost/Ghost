const should = require('should');
const supertest = require('supertest');
const config = require('../../../../../../core/server/config');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');

const ghost = testUtils.startGhost;

describe('Roles API', function () {
    let request;

    before(function () {
        return ghost()
            .then(() => {
                request = supertest.agent(config.get('url'));
            })
            .then(() => {
                return localUtils.doAuth(request, 'posts');
            });
    });

    describe('browse', function () {
        it('default', function (done) {
            request.get(localUtils.API.getApiQuery('roles/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    const response = res.body;
                    should.exist(response);
                    should.exist(response.roles);
                    testUtils.API.checkResponse(response, 'roles');
                    response.roles.should.have.length(6);
                    testUtils.API.checkResponse(response.roles[0], 'role');
                    testUtils.API.checkResponse(response.roles[1], 'role');
                    testUtils.API.checkResponse(response.roles[2], 'role');
                    testUtils.API.checkResponse(response.roles[3], 'role');
                    testUtils.API.checkResponse(response.roles[4], 'role');
                    testUtils.API.checkResponse(response.roles[5], 'role');

                    done();
                });
        });

        it('permissions=assign', function (done) {
            request.get(localUtils.API.getApiQuery('roles/?permissions=assign'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    const response = res.body;
                    should.exist(response.roles);
                    testUtils.API.checkResponse(response, 'roles');
                    response.roles.should.have.length(4);
                    testUtils.API.checkResponse(response.roles[0], 'role');
                    testUtils.API.checkResponse(response.roles[1], 'role');
                    testUtils.API.checkResponse(response.roles[2], 'role');
                    testUtils.API.checkResponse(response.roles[3], 'role');
                    response.roles[0].name.should.equal('Administrator');
                    response.roles[1].name.should.equal('Editor');
                    response.roles[2].name.should.equal('Author');
                    response.roles[3].name.should.equal('Contributor');

                    done();
                });
        });
    });
});
