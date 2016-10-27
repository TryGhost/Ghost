var supertest     = require('supertest'),
    should        = require('should'),
    testUtils     = require('../../../utils'),
    user1         = testUtils.DataGenerator.forModel.users[0],
    user2         = testUtils.DataGenerator.forModel.users[1],
    config        = require('../../../../../core/server/config'),
    ghostSetup    = testUtils.setup('settings', 'users:roles', 'perms:setting', 'perms:notification', 'perms:init'),
    ghost         = testUtils.startGhost,
    failedLoginAttempt,
    count,
    tooManyFailedLoginAttempts,
    request;

describe('Spam Prevention API', function () {
    before(function (done) {
        ghostSetup()
        .then(ghost)
        .then(function (ghostServer) {
            request = supertest.agent(ghostServer.rootApp);
        }).then(function () {
            done();
        }).then(testUtils.clearBruteData)
        .catch(done);
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    afterEach(function (done) {
        testUtils.clearBruteData().then(function () {
            done();
        }).catch(done);
    });

    it('Too many failed login attempts for a user results in 429 TooManyRequestsError', function (done) {
        count = 0;

        tooManyFailedLoginAttempts = function tooManyFailedLoginAttempts(email) {
            request.post(testUtils.API.getApiQuery('authentication/token'))
                .set('Origin', config.get('url'))
                .send({
                    grant_type: 'password',
                    username: email,
                    password: 'wrong-password',
                    client_id: 'ghost-admin',
                    client_secret: 'not_available'
                }).expect('Content-Type', /json/)
                .expect(429)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var error = res.body.errors[0];
                    should.exist(error.errorType);
                    error.errorType.should.eql('TooManyRequestsError');
                    error.message.should.eql('Too many attempts try again in 10 minutes');

                    done();
                });
        };

        failedLoginAttempt = function failedLoginAttempt(email) {
            count += 1;

            request.post(testUtils.API.getApiQuery('authentication/token'))
                .set('Origin', config.get('url'))
                .send({
                    grant_type: 'password',
                    username: email,
                    password: 'wrong-password',
                    client_id: 'ghost-admin',
                    client_secret: 'not_available'
                }).expect('Content-Type', /json/)
                .expect(401)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }
                    if (count <  config.get('spam:user_login:freeRetries') + 1) {
                        return failedLoginAttempt(email);
                    }

                    tooManyFailedLoginAttempts(email);
                });
        };

        failedLoginAttempt(user1.email);
    });

    it('Too many failed login attempts for multiple users results in 429 TooManyRequestsError', function (done) {
        count = 0;
        // We make some unsuccessful login attempts for user1 but not enough to block them. We then make some
        // failed login attempts for user2 to trigger a global block rather than user specific block

        tooManyFailedLoginAttempts = function tooManyFailedLoginAttempts(email) {
            request.post(testUtils.API.getApiQuery('authentication/token'))
                .set('Origin', config.get('url'))
                .send({
                    grant_type: 'password',
                    username: email,
                    password: 'wrong-password',
                    client_id: 'ghost-admin',
                    client_secret: 'not_available'
                }).expect('Content-Type', /json/)
                .expect(429)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }
                    var error = res.body.errors[0];
                    should.exist(error.errorType);
                    error.errorType.should.eql('TooManyRequestsError');
                    error.message.should.eql('Too many attempts try again in an hour');
                    done();
                });
        };

        failedLoginAttempt = function failedLoginAttempt(email) {
            count += 1;

            request.post(testUtils.API.getApiQuery('authentication/token'))
                .set('Origin', config.get('url'))
                .send({
                    grant_type: 'password',
                    username: email,
                    password: 'wrong-password',
                    client_id: 'ghost-admin',
                    client_secret: 'not_available'
                }).expect('Content-Type', /json/)
                .expect(401)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    if (count <  config.get('spam:user_login:freeRetries') + 1) {
                        return failedLoginAttempt(user1.email);
                    }

                    if (count < config.get('spam:global_block:freeRetries') + 1) {
                        return failedLoginAttempt(user2.email);
                    }
                    tooManyFailedLoginAttempts(user2.email);
                });
        };

        failedLoginAttempt(user1.email);
    });
});
