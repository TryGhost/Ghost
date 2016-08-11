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
    beforeEach(testUtils.setup('users:roles', 'settings', 'posts', 'perms:db', 'perms:init'));

    should.exist(dbAPI);

    it('delete all content (owner)', function () {
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
            });
        });
    });

    it('delete all content (admin)', function () {
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
            });
        });
    });

    it('delete all content is denied (editor, author & without authentication)', function () {
        return dbAPI.deleteAllContent(testUtils.context.editor).then(function () {
            throw new Error('Delete all content is not denied for editor.');
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.deleteAllContent(testUtils.context.author);
        }).then(function () {
            throw new Error('Delete all content is not denied for author.');
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.deleteAllContent();
        }).then(function () {
            throw new Error('Delete all content is not denied without authentication.');
        }).catch(function (error) {
            error.errorType.should.eql('NoPermissionError');
        });
    });

    it('export content is denied (editor, author & without authentication)', function () {
        return dbAPI.exportContent(testUtils.context.editor).then(function () {
            throw new Error('Export content is not denied for editor.');
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.exportContent(testUtils.context.author);
        }).then(function () {
            throw new Error('Export content is not denied for author.');
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.exportContent();
        }).then(function () {
            throw new Error('Export content is not denied without authentication.');
        }).catch(function (error) {
            error.errorType.should.eql('NoPermissionError');
        });
    });

    it('import content is denied (editor, author & without authentication)', function () {
        var file = {
            originalname: 'myFile.json',
            path: '/my/path/myFile.json',
            mimetype: 'application/json'
        };

        return dbAPI.importContent(_.extend(testUtils.context.editor, file)).then(function () {
            throw new Error('Import content is not denied for editor.');
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.importContent(_.extend(testUtils.context.author, file));
        }).then(function () {
            throw new Error('Import content is not denied for author.');
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.importContent(file);
        }).then(function () {
            throw new Error('Import content is not denied without authentication.');
        }).catch(function (error) {
            error.errorType.should.eql('NoPermissionError');
        });
    });

    it('import content should fail without file & with unsupported file', function () {
        return dbAPI.importContent(testUtils.context.admin).then(function () {
            throw new Error('Import content is not failed without file.');
        }, function (error) {
            error.errorType.should.eql('ValidationError');

            var context = _.extend(testUtils.context.admin, {
                originalname: 'myFile.docx', path: '/my/path/myFile.docx', mimetype: 'application/docx'
            });

            return dbAPI.importContent(context);
        }).then(function () {
            throw new Error('Import content is not failed with unsupported.');
        }, function (error) {
            error.errorType.should.eql('UnsupportedMediaTypeError');
        });
    });
});
