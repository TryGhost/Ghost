/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),

    // Stuff we are testing
    DataGenerator = require('../../utils/fixtures/data-generator'),
    TagsAPI       = require('../../../server/api/tags');

describe('Tags API', function () {

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

    it('can browse', function (done) {
        TagsAPI.browse().then(function (results) {
            should.exist(results);
            should.exist(results.tags);
            results.tags.length.should.be.above(0);
            testUtils.API.checkResponse(results.tags[0], 'tag');
            done();
        }).then(null, done);
    });
});