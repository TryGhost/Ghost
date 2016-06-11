/*global describe, it, before, after */
var testUtils     = require('../../../utils'),
    should        = require('should'),
    supertest     = require('supertest'),

    ghost         = require('../../../../../core'),

    request;

describe('Client API', function () {
    var accesstoken = '';

    before(function (done) {
        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost().then(function (ghostServer) {
            request = supertest.agent(ghostServer.rootApp);
        }).then(function () {
            return testUtils.doAuth(request, 'trusted_domains');
        }).then(function (token) {
            accesstoken = token;
            done();
        }).catch(done);
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    describe('Browse', function () {
        it('can retrieve all clients', function (done) {
            request.get(testUtils.API.getApiQuery('clients/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    should.exist(jsonResponse.clients);
                    testUtils.API.checkResponse(jsonResponse, 'clients');

                    jsonResponse.clients.should.have.length(3);
                    testUtils.API.checkResponse(jsonResponse.clients[0], 'client');
                    done();
                });
        });

        it('can retrieve all clients with trusted domains', function (done) {
            request.get(testUtils.API.getApiQuery('clients/?include=trusted_domains'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    should.exist(jsonResponse.clients);
                    testUtils.API.checkResponse(jsonResponse, 'clients');

                    jsonResponse.clients.should.have.length(3);
                    testUtils.API.checkResponse(jsonResponse.clients[0], 'client', 'trusted_domains');
                    jsonResponse.clients[0].trusted_domains.should.have.length(2);
                    done();
                });
        });
    });

    describe('Read', function () {
        it('can retrieve a client by id', function (done) {
            request.get(testUtils.API.getApiQuery('clients/1/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    should.exist(jsonResponse.clients);
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.clients.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.clients[0], 'client');
                    done();
                });
        });

        it('can retrieve a client by slug', function (done) {
            request.get(testUtils.API.getApiQuery('clients/slug/ghost-admin/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    should.exist(jsonResponse.clients);
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.clients.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.clients[0], 'client');
                    done();
                });
        });

        it('can retrieve a client with trusted_domains', function (done) {
            request.get(testUtils.API.getApiQuery('clients/1/?include=trusted_domains'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    should.exist(jsonResponse.clients);
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.clients.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.clients[0], 'client', ['trusted_domains']);
                    testUtils.API.checkResponse(jsonResponse.clients[0].trusted_domains[0], 'trusted_domain');
                    done();
                });
        });

        it('can\'t retrieve non-existent client by id', function (done) {
            request.get(testUtils.API.getApiQuery('clients/99/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.errors);
                    testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                    done();
                });
        });

        it('can\'t retrieve non-existent client by slug', function (done) {
            request.get(testUtils.API.getApiQuery('clients/slug/bad-client'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.errors);
                    testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                    done();
                });
        });
    });
});
