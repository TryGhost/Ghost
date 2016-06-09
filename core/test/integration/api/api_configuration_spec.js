var testUtils         = require('../../utils'),
    should            = require('should'),
    rewire            = require('rewire'),

    // Stuff we are testing
    ConfigurationAPI  = rewire('../../../server/api/configuration');

describe('Configuration API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    should.exist(ConfigurationAPI);

    it('can read basic config and get all expected properties', function (done) {
        ConfigurationAPI.read().then(function (response) {
            var props;

            should.exist(response);
            should.exist(response.configuration);
            response.configuration.should.be.an.Array().with.lengthOf(1);
            props = response.configuration[0];

            // Check the structure
            props.should.have.property('blogUrl').which.is.an.Object().with.properties('type', 'value');
            props.should.have.property('blogTitle').which.is.an.Object().with.properties('type', 'value');
            props.should.have.property('routeKeywords').which.is.an.Object().with.properties('type', 'value');
            props.should.have.property('fileStorage').which.is.an.Object().with.properties('type', 'value');
            props.should.have.property('useGoogleFonts').which.is.an.Object().with.properties('type', 'value');
            props.should.have.property('useGravatar').which.is.an.Object().with.properties('type', 'value');
            props.should.have.property('publicAPI').which.is.an.Object().with.properties('type', 'value');

            // Check a few values
            props.blogUrl.should.have.property('value', 'http://127.0.0.1:2369');
            props.fileStorage.should.have.property('value', true);

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
