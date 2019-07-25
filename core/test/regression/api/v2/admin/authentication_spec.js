const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../../utils/index');
const localUtils = require('./utils');
const config = require('../../../../../server/config/index');

let ghost = testUtils.startGhost;
let request;

describe.only('Authentication API v2', function () {
    var accesstoken = '', ghostServer;

    describe('Blog setup', function () {
        before(function () {
            return ghost({forceStart: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));
                });
        });

        it('is setup? no', function () {
            return request
                .get(localUtils.API.getApiQuery('authentication/setup'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(200)
                .then((res) => {
                    res.body.setup[0].status.should.be.false();
                });
        });

        it('complete setup', function () {
            return request
                .post(localUtils.API.getApiQuery('authentication/setup'))
                .set('Origin', config.get('url'))
                .send({
                    setup: [{
                        name: 'test user',
                        email: 'test@example.com',
                        password: 'thisissupersafe',
                        blogTitle: 'a test blog'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect(201)
                .then((res) => {
                    const jsonResponse = res.body;
                    should.exist(jsonResponse.users);
                    should.not.exist(jsonResponse.meta);

                    jsonResponse.users.should.have.length(1);
                    localUtils.API.checkResponse(jsonResponse.users[0], 'user');

                    const newUser = jsonResponse.users[0];
                    newUser.id.should.equal(testUtils.DataGenerator.Content.users[0].id);
                    newUser.name.should.equal('test user');
                    newUser.email.should.equal('test@example.com');
                });
        });

        it('is setup? yes', function () {
            return request
                .get(localUtils.API.getApiQuery('authentication/setup'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(200)
                .then((res) => {
                    res.body.setup[0].status.should.be.true();
                });
        });

        it('complete setup again', function () {
            return request
                .post(localUtils.API.getApiQuery('authentication/setup'))
                .set('Origin', config.get('url'))
                .send({
                    setup: [{
                        name: 'test user',
                        email: 'test-leo@example.com',
                        password: 'thisissupersafe',
                        blogTitle: 'a test blog'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect(403);
        });
    });

    describe('Invitation', function () {
        before(function () {
            return ghost()
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('url'));

                    // simulates blog setup (initialises the owner)
                    return localUtils.doAuth(request, 'invites');
                });
        });

        it('check invite with invalid email', function () {
            return request
                .get(localUtils.API.getApiQuery('authentication/invitation?email=invalidemail'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(400);
        });

        it('check valid invite', function () {
            return request
                .get(localUtils.API.getApiQuery(`authentication/invitation?email=${testUtils.DataGenerator.forKnex.invites[0].email}`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(200)
                .then((res) => {
                    res.body.invitation[0].valid.should.equal(true);
                });
        });

        it('check invalid invite', function () {
            return request
                .get(localUtils.API.getApiQuery(`authentication/invitation?email=notinvited@example.org`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect(200)
                .then((res) => {
                    res.body.invitation[0].valid.should.equal(false);
                });
        });

        it('try to accept without invite', function () {
            return request
                .post(localUtils.API.getApiQuery('authentication/invitation'))
                .set('Origin', config.get('url'))
                .send({
                    invitation: [{
                        token: 'lul11111',
                        password: 'lel123456',
                        email: 'not-invited@example.org',
                        name: 'not invited'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect(404);
        });

        it('try to accept with invite', function () {
            return request
                .post(localUtils.API.getApiQuery('authentication/invitation'))
                .set('Origin', config.get('url'))
                .send({
                    invitation: [{
                        token: testUtils.DataGenerator.forKnex.invites[0].token,
                        password: '12345678910',
                        email: testUtils.DataGenerator.forKnex.invites[0].email,
                        name: 'invited'
                    }]
                })
                .expect('Content-Type', /json/)
                .expect(200)
                .then((res) => {
                    res.body.invitation[0].message.should.equal('Invitation accepted.');
                });
        });
    });
});
