/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),

    // Stuff we are testing
    permissions     = require('../../../server/permissions'),
    DataGenerator = require('../../utils/fixtures/data-generator'),
    TagsAPI       = require('../../../server/api/tags');

describe('Tags API', function () {

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultFixtures();
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

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    it('can browse (internal)', function (done) {
        TagsAPI.browse({context: {internal: true}}).then(function (results) {
            should.exist(results);
            should.exist(results.tags);
            results.tags.length.should.be.above(0);
            testUtils.API.checkResponse(results.tags[0], 'tag');
            results.tags[0].created_at.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('can browse (admin)', function (done) {
            TagsAPI.browse({context: {user: 1}}).then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);
                testUtils.API.checkResponse(results.tags[0], 'tag');
                results.tags[0].created_at.should.be.an.instanceof(Date);

                done();
            }).catch(done);
        });

    it('can browse (editor)', function (done) {
            TagsAPI.browse({context: {user: 2}}).then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);
                testUtils.API.checkResponse(results.tags[0], 'tag');
                results.tags[0].created_at.should.be.an.instanceof(Date);

                done();
            }).catch(done);
        });

    it('can browse (author)', function (done) {
        TagsAPI.browse({context: {user: 3}}).then(function (results) {
            should.exist(results);
            should.exist(results.tags);
            results.tags.length.should.be.above(0);
            testUtils.API.checkResponse(results.tags[0], 'tag');
            results.tags[0].created_at.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });
});