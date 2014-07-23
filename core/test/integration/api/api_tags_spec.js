/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/
var testUtils   = require('../../utils'),
    should      = require('should'),

    // Stuff we are testing
    TagAPI      = require('../../../server/api/tags');

describe('Tags API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'tag', 'perms:tag', 'perms:init'));

    should.exist(TagAPI);

    it('can browse (internal)', function (done) {
        TagAPI.browse(testUtils.context.internal).then(function (results) {
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
        TagAPI.browse(testUtils.context.admin).then(function (results) {
            should.exist(results);
            should.exist(results.tags);
            results.tags.length.should.be.above(0);
            testUtils.API.checkResponse(results.tags[0], 'tag');
            results.tags[0].created_at.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('can browse (editor)', function (done) {
        TagAPI.browse(testUtils.context.editor).then(function (results) {
            should.exist(results);
            should.exist(results.tags);
            results.tags.length.should.be.above(0);
            testUtils.API.checkResponse(results.tags[0], 'tag');
            results.tags[0].created_at.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('can browse (author)', function (done) {
        TagAPI.browse(testUtils.context.author).then(function (results) {
            should.exist(results);
            should.exist(results.tags);
            results.tags.length.should.be.above(0);
            testUtils.API.checkResponse(results.tags[0], 'tag');
            results.tags[0].created_at.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });
});