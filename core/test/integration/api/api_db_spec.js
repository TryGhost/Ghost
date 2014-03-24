/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),

    // Stuff we are testing
    DataGenerator    = require('../../utils/fixtures/data-generator'),
    dbAPI = require('../../../server/api/db');
    TagsAPI = require('../../../server/api/tags');
    PostAPI = require('../../../server/api/posts');

describe('DB API', function () {

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultFixtures();
            })
            .then(function () {
                done();
            }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it('delete all content', function (done) {
        
        dbAPI.deleteAllContent().then(function (result){
            should.exist(result.message);
            result.message.should.equal('Successfully deleted all content from your blog.')
        }).then(function () {
            TagsAPI.browse().then(function (results) {
                should.exist(results);
                results.length.should.equal(0);
            });
        }).then(function () {
            PostAPI.browse().then(function (results) {
                should.exist(results);
                results.posts.length.should.equal(0);
                done();
            });
        }).then(null, done);
    });
});