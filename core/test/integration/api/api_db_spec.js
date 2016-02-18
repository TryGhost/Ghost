/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),
    _         = require('lodash'),

    // Stuff we are testing
    dbAPI          = require('../../../server/api/db'),
    ModelTag       = require('../../../server/models/tag'),
    ModelPost      = require('../../../server/models/post');

describe('DB API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'posts', 'perms:db', 'perms:init'));

    should.exist(dbAPI);

    it('delete all content (owner)', function (done) {
        return dbAPI.deleteAllContent(testUtils.context.owner).then(function (result) {
            should.exist(result.db);
            result.db.should.be.instanceof(Array);
            result.db.should.be.empty();
        }).then(function () {
            return ModelTag.Tag.findAll(testUtils.context.owner).then(function (results) {
                should.exist(results);
                results.length.should.equal(0);
            });
        }).then(function () {
            return ModelPost.Post.findAll(testUtils.context.owner).then(function (results) {
                should.exist(results);
                results.length.should.equal(0);
                done();
            });
        }).catch(done);
    });

    it('delete all content (admin)', function (done) {
        return dbAPI.deleteAllContent(testUtils.context.admin).then(function (result) {
            should.exist(result.db);
            result.db.should.be.instanceof(Array);
            result.db.should.be.empty();
        }).then(function () {
            return ModelTag.Tag.findAll(testUtils.context.admin).then(function (results) {
                should.exist(results);
                results.length.should.equal(0);
            });
        }).then(function () {
            return ModelPost.Post.findAll(testUtils.context.admin).then(function (results) {
                should.exist(results);
                results.length.should.equal(0);
                done();
            });
        }).catch(done);
    });

    it('delete all content is denied (editor, author & without authentication)', function (done) {
        return dbAPI.deleteAllContent(testUtils.context.editor).then(function () {
            done(new Error('Delete all content is not denied for editor.'));
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.deleteAllContent(testUtils.context.author);
        }).then(function () {
            done(new Error('Delete all content is not denied for author.'));
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.deleteAllContent();
        }).then(function () {
            done(new Error('Delete all content is not denied without authentication.'));
        }).catch(function (error) {
            error.errorType.should.eql('NoPermissionError');
            done();
        }).catch(done);
    });

    it('export content is denied (editor, author & without authentication)', function (done) {
        return dbAPI.exportContent(testUtils.context.editor).then(function () {
            done(new Error('Export content is not denied for editor.'));
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.exportContent(testUtils.context.author);
        }).then(function () {
            done(new Error('Export content is not denied for author.'));
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.exportContent();
        }).then(function () {
            done(new Error('Export content is not denied without authentication.'));
        }).catch(function (error) {
            error.errorType.should.eql('NoPermissionError');
            done();
        }).catch(done);
    });

    it('import content is denied (editor, author & without authentication)', function (done) {
        var file = {importfile: {
            name: 'myFile.json',
            path: '/my/path/myFile.json',
            type: 'application/json'
        }};

        return dbAPI.importContent(_.extend(testUtils.context.editor, file)).then(function () {
            done(new Error('Import content is not denied for editor.'));
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.importContent(_.extend(testUtils.context.author, file));
        }).then(function () {
            done(new Error('Import content is not denied for author.'));
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.importContent(file);
        }).then(function () {
            done(new Error('Import content is not denied without authentication.'));
        }).catch(function (error) {
            error.errorType.should.eql('NoPermissionError');
            done();
        }).catch(done);
    });

    it('import content should fail without file & with unsupported file', function (done) {
        return dbAPI.importContent(testUtils.context.admin).then(function () {
            done(new Error('Import content is not failed without file.'));
        }, function (error) {
            error.errorType.should.eql('ValidationError');

            var context = _.extend(testUtils.context.admin, {
                importfile: {name: 'myFile.docx', path: '/my/path/myFile.docx', type: 'application/docx'}
            });

            return dbAPI.importContent(context);
        }).then(function () {
            done(new Error('Import content is not failed with unsupported.'));
        }, function (error) {
            error.errorType.should.eql('UnsupportedMediaTypeError');
            done();
        }).catch(done);
    });
});
