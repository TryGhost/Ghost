/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/
var testUtils = require('../../utils'),
    should    = require('should'),

    // Stuff we are testing
    permissions   = require('../../../server/permissions'),
    dbAPI         = require('../../../server/api/db'),
    TagsAPI       = require('../../../server/api/tags'),
    PostAPI       = require('../../../server/api/posts');

describe('DB API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    beforeEach(function (done) {
        testUtils.initData().then(function () {
            return testUtils.insertDefaultFixtures();
        }).then(function () {
            return testUtils.insertEditorUser();
        }).then(function () {
            return testUtils.insertAuthorUser();
        }).then(function () {
            done();
        }).catch(done);
    });

    should.exist(dbAPI);

    it('delete all content', function (done) {
        var options = {context: {user: 1}};
        permissions.init().then(function () {
            return dbAPI.deleteAllContent(options);
        }).then(function (result) {
            should.exist(result.db);
            result.db.should.be.instanceof(Array);
            result.db.should.be.empty;
        }).then(function () {
            return TagsAPI.browse(options).then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.equal(0);
            });
        }).then(function () {
            return PostAPI.browse(options).then(function (results) {
                should.exist(results);
                results.posts.length.should.equal(0);
                done();
            });
        }).catch(done);
    });

    it('delete all content is denied', function (done) {
        permissions.init().then(function () {
            return dbAPI.deleteAllContent({context: {user: 2}});
        }).then(function (){
            done(new Error('Delete all content is not denied for editor.'));
        }, function (error) {
            error.type.should.eql('NoPermissionError');
            return dbAPI.deleteAllContent({context: {user: 3}});
        }).then(function (){
            done(new Error('Delete all content is not denied for author.'));
        }, function (error) {
            error.type.should.eql('NoPermissionError');
            return dbAPI.deleteAllContent();
        }).then(function (){
            done(new Error('Delete all content is not denied without authentication.'));
        }).catch(function (error) {
            error.type.should.eql('NoPermissionError');
            done();
        }).catch(done);
    });

    it('export content is denied', function (done) {
        permissions.init().then(function () {
            return dbAPI.exportContent({context: {user: 2}});
        }).then(function (){
            done(new Error('Export content is not denied for editor.'));
        }, function (error) {
            error.type.should.eql('NoPermissionError');
            return dbAPI.exportContent({context: {user: 3}});
        }).then(function (){
            done(new Error('Export content is not denied for author.'));
        }, function (error) {
            error.type.should.eql('NoPermissionError');
            return dbAPI.exportContent();
        }).then(function (){
            done(new Error('Export content is not denied without authentication.'));
        }).catch(function (error) {
            error.type.should.eql('NoPermissionError');
            done();
        }).catch(done);
    });

    it('import content is denied', function (done) {
        permissions.init().then(function () {
            return dbAPI.importContent({context: {user: 2}});
        }).then(function () {
            done(new Error('Import content is not denied for editor.'));
        }, function (error) {
            error.type.should.eql('NoPermissionError');
            return dbAPI.importContent({context: {user: 3}});
        }).then(function () {
            done(new Error('Import content is not denied for author.'));
        }, function (error) {
            error.type.should.eql('NoPermissionError');
            return dbAPI.importContent();
        }).then(function () {
            done(new Error('Import content is not denied without authentication.'));
        }).catch(function (error) {
            error.type.should.eql('NoPermissionError');
            done();
        }).catch(done);
    });
});