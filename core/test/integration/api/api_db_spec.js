var should = require('should'),
    testUtils = require('../../utils'),
    _ = require('lodash'),
    dbAPI = require('../../../server/api/db'),
    models = require('../../../server/models');

describe('DB API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'settings', 'posts', 'subscriber', 'perms:db', 'perms:init'));

    should.exist(dbAPI);

    it('delete all content (owner)', function () {
        return dbAPI.deleteAllContent(testUtils.context.owner).then(function (result) {
            should.exist(result.db);
            result.db.should.be.instanceof(Array);
            result.db.should.be.empty();
        }).then(function () {
            return models.Tag.findAll(testUtils.context.owner).then(function (results) {
                should.exist(results);
                results.length.should.equal(0);
            });
        }).then(function () {
            return models.Post.findAll(testUtils.context.owner).then(function (results) {
                should.exist(results);
                results.length.should.equal(0);
            });
        }).then(function () {
            return models.Subscriber.findAll(testUtils.context.owner).then(function (results) {
                should.exist(results);
                results.length.should.equal(1);
            });
        });
    });

    it('delete all content (admin)', function () {
        return dbAPI.deleteAllContent(testUtils.context.admin).then(function (result) {
            should.exist(result.db);
            result.db.should.be.instanceof(Array);
            result.db.should.be.empty();
        }).then(function () {
            return models.Tag.findAll(testUtils.context.admin).then(function (results) {
                should.exist(results);
                results.length.should.equal(0);
            });
        }).then(function () {
            return models.Post.findAll(testUtils.context.admin).then(function (results) {
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
});
