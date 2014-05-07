var should = require('should');
var when = require('when');
var rewire = require('rewire');
var packageInfo = require('../../../package');
var ghost = require('../../../core');
var permissions = require('../../server/permissions');
var testUtils = require('../utils');
var updateCheck = rewire('../../server/update-check');

describe('Update Check', function () {
    var environmentsOrig;

    before(function (done) {
        environmentsOrig = updateCheck.__get__('allowedCheckEnvironments');
        updateCheck.__set__('allowedCheckEnvironments', ['development', 'production', 'testing']);

        ghost().then(function () {
            return testUtils.clearData();
        }).then(function () {
            done();
        }, done);
    });

    after(function () {
        updateCheck.__set__('allowedCheckEnvironments', environmentsOrig);
    });

    beforeEach(function (done) {
        testUtils.initData().then(function () {
            return testUtils.insertDefaultFixtures();
        }).then(function () {
            return testUtils.insertEditorUser();
        }).then(function () {
            return testUtils.insertAuthorUser();
        }).then(function () {
            return permissions.init();
        }).then(function () {
            done();
        }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it('should report the correct data', function (done) {
        var updateCheckData = updateCheck.__get__('updateCheckData');

        updateCheckData().then(function (data) {
            should.exist(data);
            data.ghost_version.should.equal(packageInfo.version);
            data.node_version.should.equal(process.versions.node);
            data.env.should.equal(process.env.NODE_ENV);
            data.database_type.should.match(/sqlite3|pg|mysql/);
            data.blog_id.should.be.a.string;
            data.blog_id.should.not.be.empty;
            data.theme.should.be.equal('casper');
            data.apps.should.be.a.string;
            data.blog_created_at.should.be.a.number;
            data.user_count.should.be.above(0);
            data.post_count.should.be.above(0);
            data.npm_version.should.be.a.string;
            data.npm_version.should.not.be.empty;

            done();
        }).catch(done);
    });
});
