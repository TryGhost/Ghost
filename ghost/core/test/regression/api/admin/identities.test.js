const should = require('should');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const testUtils = require('../../../utils');
const localUtils = require('./utils');
const config = require('../../../../core/shared/config');

let request;

const verifyJWKS = (endpoint, token) => {
    return new Promise((resolve, reject) => {
        const client = jwksClient({
            jwksUri: endpoint
        });

        async function getKey(header, callback) {
            const key = await client.getSigningKey(header.kid);
            let signingKey = key.publicKey || key.rsaPublicKey;
            callback(null, signingKey);
        }

        jwt.verify(token, getKey, {}, (err, decoded) => {
            if (err) {
                reject(err);
            }

            resolve(decoded);
        });
    });
};

describe('Identities API', function () {
    describe('As Owner', function () {
        before(async function () {
            await localUtils.startGhost();
            request = supertest.agent(config.get('url'));
            await localUtils.doAuth(request);
        });

        it('Can create JWT token and verify it afterwards with public jwks', function () {
            let identity;

            return request
                .get(localUtils.API.getApiQuery(`identities/`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.identities);

                    identity = jsonResponse.identities[0];
                })
                .then(() => {
                    return verifyJWKS(`${request.app}/ghost/.well-known/jwks.json`, identity.token);
                })
                .then((decoded) => {
                    decoded.sub.should.equal('jbloggs@example.com');
                    decoded.role.should.equal('Owner');
                });
        });
    });

    describe('As Administrator', function () {
        before(function () {
            return localUtils.startGhost()
                .then(function () {
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

                    return localUtils.doAuth(request);
                });
        });

        it('Can create JWT token and verify it afterwards with public jwks', function () {
            let identity;

            return request
                .get(localUtils.API.getApiQuery(`identities/`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    should.not.exist(res.headers['x-cache-invalidate']);
                    const jsonResponse = res.body;
                    should.exist(jsonResponse);
                    should.exist(jsonResponse.identities);

                    identity = jsonResponse.identities[0];
                })
                .then(() => {
                    return verifyJWKS(`${request.app}/ghost/.well-known/jwks.json`, identity.token);
                })
                .then((decoded) => {
                    decoded.sub.should.equal('admin+1@ghost.org');
                    decoded.role.should.equal('Administrator');
                });
        });
    });

    describe('As Editor', function () {
        before(function () {
            return localUtils.startGhost()
                .then(function () {
                    request = supertest.agent(config.get('url'));
                })
                .then(function () {
                    return testUtils.createUser({
                        user: testUtils.DataGenerator.forKnex.createUser({email: 'editor+1@ghost.org'}),
                        role: testUtils.DataGenerator.Content.roles[1].name
                    });
                })
                .then(function (admin) {
                    request.user = admin;

                    return localUtils.doAuth(request);
                });
        });

        it('Cannot read', function () {
            return request
                .get(localUtils.API.getApiQuery(`identities/`))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(403);
        });
    });
});
