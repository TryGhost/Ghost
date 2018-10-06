const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const config = require('../../../../../core/server/config');
const ghost = testUtils.startGhost;
let request;

describe('Invites API', function () {
    var accesstoken = '', ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'invites');
            })
            .then(function (token) {
                accesstoken = token;
            });
    });

    describe('browse', function () {
        it('default', function (done) {
            request.get(localUtils.API.getApiQuery('invites/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.invites);
                    jsonResponse.invites.should.have.length(2);

                    testUtils.API.checkResponse(jsonResponse, 'invites');
                    testUtils.API.checkResponse(jsonResponse.invites[0], 'invite');

                    jsonResponse.invites[0].status.should.eql('sent');
                    jsonResponse.invites[0].email.should.eql('test1@ghost.org');
                    jsonResponse.invites[0].role_id.should.eql(testUtils.roles.ids.admin);

                    jsonResponse.invites[1].status.should.eql('sent');
                    jsonResponse.invites[1].email.should.eql('test2@ghost.org');
                    jsonResponse.invites[1].role_id.should.eql(testUtils.roles.ids.author);

                    done();
                });
        });
    });

    describe('read', function () {
        it('default', function (done) {
            request.get(localUtils.API.getApiQuery(`invites/${testUtils.DataGenerator.forKnex.invites[0].id}/`))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.invites);
                    jsonResponse.invites.should.have.length(1);

                    testUtils.API.checkResponse(jsonResponse.invites[0], 'invite');

                    done();
                });
        });
    });

    describe('add', function () {
        it('default', function (done) {
            request.post(localUtils.API.getApiQuery('invites/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .send({
                    invites: [{email: 'test@example.com', role_id: testUtils.existingData.roles[0].id}]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.invites);
                    jsonResponse.invites.should.have.length(1);

                    testUtils.API.checkResponse(jsonResponse.invites[0], 'invite');
                    jsonResponse.invites[0].role_id.should.eql(testUtils.existingData.roles[0].id);

                    done();
                });
        });

        it('user exists', function (done) {
            request.post(localUtils.API.getApiQuery('invites/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .send({
                    invites: [{email: 'ghost-author@example.com', role_id: testUtils.existingData.roles[1].id}]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(422)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });
    });

    describe('destroy', function () {
        it('default', function (done) {
            request.del(localUtils.API.getApiQuery(`invites/${testUtils.DataGenerator.forKnex.invites[0].id}/`))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(204)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });
    });
});
