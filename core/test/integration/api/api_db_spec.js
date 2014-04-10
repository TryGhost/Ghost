/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),

    // Stuff we are testing
    permissions   = require('../../../server/permissions'),
    DataGenerator = require('../../utils/fixtures/data-generator'),
    dbAPI         = require('../../../server/api/db');
    TagsAPI       = require('../../../server/api/tags');
    PostAPI       = require('../../../server/api/posts');

describe('DB API', function () {

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        testUtils.initData().then(function () {
            return testUtils.insertDefaultFixtures();
        }).then(function () {
            return testUtils.insertEditorUser();
        }).then(function () {
            return testUtils.insertAuthorUser();
        }).then(function () {
            done();
        }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it('delete all content', function (done) {
        permissions.init().then(function () {
            return dbAPI.deleteAllContent.call({user: 1});
        }).then(function (result){
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
        }).otherwise(function (error) {
            done(new Error(JSON.stringify(error)));
        });
    });

    it('delete all content is denied', function (done) {
        permissions.init().then(function () {
            return dbAPI.deleteAllContent.call({user: 2});
        }).then(function (){
            done(new Error("Delete all content is not denied for editor."));
        }, function (error) {
            error.code.should.eql(403);
            return dbAPI.deleteAllContent.call({user: 3});
        }).then(function (){
            done(new Error("Delete all content is not denied for author."));
        }, function (error) {
            error.code.should.eql(403);
            return dbAPI.deleteAllContent();
        }).then(function (){
            done(new Error("Delete all content is not denied without authentication."));
        }, function (error) {
            error.code.should.eql(403);
            done();
        });
    });

    it('export content is denied', function (done) {
        permissions.init().then(function () {
            return dbAPI.exportContent.call({user: 2});
        }).then(function (){
            done(new Error("Export content is not denied for editor."));
        }, function (error) {
            error.code.should.eql(403);
            return dbAPI.exportContent.call({user: 3});
        }).then(function (){
            done(new Error("Export content is not denied for author."));
        }, function (error) {
            error.code.should.eql(403);
            return dbAPI.exportContent();
        }).then(function (){
            done(new Error("Export content is not denied without authentication."));
        }, function (error) {
            error.code.should.eql(403);
            done();
        });
    });

    it('import content is denied', function (done) {
        permissions.init().then(function () {
            return dbAPI.importContent.call({user: 2});
        }).then(function (result){
            done(new Error("Import content is not denied for editor."));
        }, function (error) {
            error.code.should.eql(403);
            return dbAPI.importContent.call({user: 3});
        }).then(function (result){
            done(new Error("Import content is not denied for author."));
        }, function (error) {
            error.code.should.eql(403);
            return dbAPI.importContent();
        }).then(function (result){
            done(new Error("Import content is not denied without authentication."));
        }, function (error) {
            error.code.should.eql(403);
            done();
        });
    });
});