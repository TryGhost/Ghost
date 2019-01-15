const should = require('should');
const supertest = require('supertest');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const config = require('../../../../../../core/server/config');
const ghost = testUtils.startGhost;

let request;
describe('Configuration API', function () {
    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request);
            });
    });

    describe('success', function () {
        it('can retrieve public configuration and all expected properties', function (done) {
            request.get(localUtils.API.getApiQuery('configuration/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.exist(res.body.configuration);

                    res.body.configuration.should.be.an.Array().with.lengthOf(1);
                    const props = res.body.configuration[0];

                    props.blogUrl.should.eql('http://127.0.0.1:2369/');

                    props.useGravatar.should.eql(false);
                    props.clientId.should.eql('ghost-admin');
                    props.clientSecret.should.eql('not_available');

                    // value not available, because settings API was not called yet
                    props.hasOwnProperty('blogTitle').should.eql(true);
                    done();
                });
        });

        it('can read about config and get all expected properties', function (done) {
            request.get(localUtils.API.getApiQuery('configuration/about/'))
                .set('Origin', config.get('url'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.exist(res.body.configuration);

                    res.body.configuration.should.be.an.Array().with.lengthOf(1);
                    const props = res.body.configuration[0];

                    // Check the structure
                    props.should.have.property('version').which.is.a.String();
                    props.should.have.property('environment').which.is.a.String();
                    props.should.have.property('database').which.is.a.String();
                    props.should.have.property('mail').which.is.a.String();

                    // Check a few values
                    props.environment.should.match(/^testing/);
                    props.version.should.eql(require('../../../../../../package.json').version);
                    done();
                });
        });
    });
});
