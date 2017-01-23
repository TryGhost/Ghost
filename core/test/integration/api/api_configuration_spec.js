var testUtils = require('../../utils'),
    configUtils = require('../../utils/configUtils'),
    should = require('should'),
    rewire = require('rewire'),

    // Stuff we are testing
    ConfigurationAPI = rewire('../../../server/api/configuration');

describe('Configuration API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    beforeEach(testUtils.setup('clients'));
    afterEach(function () {
        configUtils.restore();
        return testUtils.teardown();
    });

    should.exist(ConfigurationAPI);

    it('can read basic config and get all expected properties', function (done) {
        configUtils.set('auth:type', 'ghost');

        ConfigurationAPI.read().then(function (response) {
            var props;

            should.exist(response);
            should.exist(response.configuration);
            response.configuration.should.be.an.Array().with.lengthOf(1);
            props = response.configuration[0];

            props.blogUrl.should.eql('http://127.0.0.1:2369/');
            props.routeKeywords.should.eql({
                tag: 'tag',
                author: 'author',
                page: 'page',
                preview: 'p',
                private: 'private',
                subscribe: 'subscribe',
                amp: 'amp'
            });

            props.fileStorage.should.eql(true);
            props.useGravatar.should.eql(true);
            props.publicAPI.should.eql(false);
            props.clientId.should.eql('ghost-admin');
            props.clientSecret.should.eql('not_available');
            props.ghostAuthUrl.should.eql('http://devauth.ghost.org:8080');

            // value not available, because settings API was not called yet
            props.hasOwnProperty('blogTitle').should.eql(true);

            // uuid
            props.hasOwnProperty('ghostAuthId').should.eql(true);

            done();
        }).catch(done);
    });

    it('can read about config and get all expected properties', function (done) {
        ConfigurationAPI.read({key: 'about'}).then(function (response) {
            var props;

            should.exist(response);
            should.exist(response.configuration);
            response.configuration.should.be.an.Array().with.lengthOf(1);
            props = response.configuration[0];

            // Check the structure
            props.should.have.property('version').which.is.a.String();
            props.should.have.property('environment').which.is.a.String();
            props.should.have.property('database').which.is.a.String();
            props.should.have.property('mail').which.is.a.String();

            // Check a few values
            props.environment.should.match(/^testing/);
            props.version.should.eql(require('../../../../package.json').version);

            done();
        }).catch(done);
    });
});
