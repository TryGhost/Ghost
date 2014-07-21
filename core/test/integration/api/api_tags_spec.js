/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/
var testUtils   = require('../../utils'),
    should      = require('should'),

    // Stuff we are testing
    permissions = require('../../../server/permissions'),
    TagAPI      = require('../../../server/api/tags');

describe('Tags API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultFixtures();
            }).then(function () {
                return testUtils.insertAdminUser();
            }).then(function () {
                return testUtils.insertEditorUser();
            }).then(function () {
                return testUtils.insertAuthorUser();
            }).then(function () {
                return permissions.init();
            }).then(function () {
                done();
            }).catch(done);
    });

    should.exist(TagAPI);

    it('can browse (internal)', function (done) {
        TagAPI.browse({context: {internal: true}}).then(function (results) {
            should.exist(results);
            should.exist(results.tags);
            results.tags.length.should.be.above(0);
            testUtils.API.checkResponse(results.tags[0], 'tag');
            results.tags[0].created_at.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('can browse (owner)', function (done) {
        TagAPI.browse({context: {user: 1}}).then(function (results) {
            should.exist(results);
            should.exist(results.tags);
            results.tags.length.should.be.above(0);
            testUtils.API.checkResponse(results.tags[0], 'tag');
            results.tags[0].created_at.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('can browse (admin)', function (done) {
        TagAPI.browse({context: {user: 2}}).then(function (results) {
            should.exist(results);
            should.exist(results.tags);
            results.tags.length.should.be.above(0);
            testUtils.API.checkResponse(results.tags[0], 'tag');
            results.tags[0].created_at.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('can browse (editor)', function (done) {
        TagAPI.browse({context: {user: 3}}).then(function (results) {
            should.exist(results);
            should.exist(results.tags);
            results.tags.length.should.be.above(0);
            testUtils.API.checkResponse(results.tags[0], 'tag');
            results.tags[0].created_at.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('can browse (author)', function (done) {
        TagAPI.browse({context: {user: 4}}).then(function (results) {
            should.exist(results);
            should.exist(results.tags);
            results.tags.length.should.be.above(0);
            testUtils.API.checkResponse(results.tags[0], 'tag');
            results.tags[0].created_at.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });
});