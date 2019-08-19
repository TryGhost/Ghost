const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../utils/index');
const localUtils = require('./utils');
const db = require('../../../../server/data/db/index');
const config = require('../../../../server/config/index');

const executeRequests = (attempts, requestFn, ...args) => {
    if (attempts === 0) {
        return Promise.resolve();
    }

    return requestFn(...args).then(() => {
        return executeRequests(attempts - 1, requestFn, ...args);
    });
};

describe('Spam Prevention API', function () {
    const userAllowedAttempts = config.get('spam:user_login:freeRetries');
    const globalAllowedAttempts = config.get('spam:global_block:freeRetries');
    const correctPassword = 'Sl1m3rson99';
    const incorrectPassword = 'wrong-password';
    const owner = testUtils.DataGenerator.Content.users[0];
    let author;
    let loginAttempt;

    before(function () {
        return testUtils.startGhost()
            .then(function () {
                const request = supertest.agent(config.get('url'));

                // in functional tests we start Ghost and the database get's migrated/seeded
                loginAttempt = (email, password) => request.post(localUtils.API.getApiQuery('authentication/token'))
                    .set('Origin', config.get('url'))
                    .send({
                        grant_type: 'password',
                        username: email,
                        password: password,
                        client_id: 'ghost-admin',
                        client_secret: 'not_available'
                    }).expect('Content-Type', /json/);

                // no need to add or care about any missing data (settings, permissions) except of extra data we would like to add or override
                // override Ghost fixture owner and add some extra users
                return testUtils.setup('owner:post')();
            }).then(function () {
                return testUtils.createUser({
                    user: testUtils.DataGenerator.forKnex.createUser({email: 'test+1@ghost.org'}),
                    role: testUtils.DataGenerator.Content.roles[1].name
                });
            })
            .then(function (user) {
                author = user;
            });
    });

    afterEach(function () {
        return testUtils.clearBruteData();
    });

    it('Too many failed login attempts for a user results in 429 TooManyRequestsError', function () {
        return executeRequests(userAllowedAttempts + 1, loginAttempt, owner.email, incorrectPassword)
            .then(() => loginAttempt(owner.email, correctPassword))
            .then(function (res) {
                const error = res.body.errors[0];
                should.exist(error.errorType);
                res.statusCode.should.eql(429);
                error.errorType.should.eql('TooManyRequestsError');
                error.message.should.eql('Too many sign-in attempts try again in 10 minutes');
            });
    });

    it('Too many failed login attempts for multiple users results in 429 TooManyRequestsError', function () {
        const attemptsPerUserToAchieveGlobalBlock = Math.ceil((globalAllowedAttempts + 1) / 2);
        return executeRequests(attemptsPerUserToAchieveGlobalBlock, loginAttempt, owner.email, incorrectPassword)
            .then(() => executeRequests(attemptsPerUserToAchieveGlobalBlock, loginAttempt, author.email, incorrectPassword))
            .then(() => loginAttempt('random@user.com', 'random'))
            .then((res) => {
                const error = res.body.errors[0];
                should.exist(error.errorType);
                res.statusCode.should.eql(429);
                error.errorType.should.eql('TooManyRequestsError');
                error.message.should.eql('Too many attempts try again in an hour');
            });
    });

    it('Ensure reset works: password grant type', function () {
        return executeRequests(userAllowedAttempts - 1, loginAttempt, owner.email, incorrectPassword)
            .then(() => loginAttempt(owner.email, correctPassword))
            // CASE: login in with bad credentials twice - which would
            // take us over the limit if the block hasn't been reset
            .then(() => loginAttempt(owner.email, incorrectPassword))
            .then(() => loginAttempt(owner.email, incorrectPassword))
            .then((res) => {
                // CASE: the reset means that we should be able to attempt to log in again
                // and not get a too many requests error
                const error = res.body.errors[0];
                should.exist(error.errorType);
                res.statusCode.should.eql(422);
                error.errorType.should.eql('ValidationError');
                error.message.should.eql('Your password is incorrect.');
            });
    });
});
