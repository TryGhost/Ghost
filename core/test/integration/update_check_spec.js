/*globals describe, before, beforeEach, afterEach, after, it */
var should         = require('should'),
    rewire         = require('rewire'),
    _              = require('lodash'),
    packageInfo    = require('../../../package'),
    ghost          = require('../../../core'),
    config         = rewire('../../../core/server/config'),
    defaultConfig  = require('../../../config.example')[process.env.NODE_ENV],
    permissions    = require('../../server/permissions'),
    testUtils      = require('../utils'),
    updateCheck    = rewire('../../server/update-check');

describe('Update Check', function () {
    var environmentsOrig;

    before(function (done) {
        environmentsOrig = updateCheck.__get__('allowedCheckEnvironments');
        updateCheck.__set__('allowedCheckEnvironments', ['development', 'production', 'testing']);

        _.extend(config, defaultConfig);

        ghost({config: config.paths.config}).then(function () {
            return testUtils.clearData();
        }).then(function () {
            done();
        }).catch(function (err) {
            console.log('Update Check before error', err);
            throw new Error(err);
        });
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
        }).catch(function (err) {
            console.log('Update Check beforeEach error', err);
            throw new Error(err);
        });
    });

    afterEach(testUtils.teardown);

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
