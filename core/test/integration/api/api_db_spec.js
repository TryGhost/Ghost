var should = require('should'),
    _ = require('lodash'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    common = require('../../../server/lib/common'),
    dbAPI = require('../../../server/api/v0.1/db'),
    models = require('../../../server/models'),
    sandbox = sinon.sandbox.create();

describe('DB API', function () {
    var eventsTriggered;

    afterEach(function () {
        sandbox.restore();
    });

    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'settings', 'posts', 'subscriber', 'perms:db', 'perms:init'));

    beforeEach(function () {
        eventsTriggered = {};

        sandbox.stub(common.events, 'emit').callsFake(function (eventName, eventObj) {
            if (!eventsTriggered[eventName]) {
                eventsTriggered[eventName] = [];
            }

            eventsTriggered[eventName].push(eventObj);
        });
    });

    should.exist(dbAPI);

    it('delete all content (owner)', function () {
        return models.Post.findAll(testUtils.context.internal)
            .then(function (results) {
                results = results.toJSON();

                results.length.should.eql(8);

                _.filter(results, {page: false, status: 'published'}).length.should.equal(4);
                _.filter(results, {page: false, status: 'draft'}).length.should.equal(1);
                _.filter(results, {page: false, status: 'scheduled'}).length.should.equal(1);
                _.filter(results, {page: true, status: 'published'}).length.should.equal(1);
                _.filter(results, {page: true, status: 'draft'}).length.should.equal(1);
            })
            .then(function () {
                return dbAPI.deleteAllContent(testUtils.context.owner);
            })
            .then(function (result) {
                should.exist(result.db);
                result.db.should.be.instanceof(Array);
                result.db.should.be.empty();

                return models.Tag.findAll(testUtils.context.internal);
            })
            .then(function (results) {
                should.exist(results);
                results.length.should.equal(0);

                return models.Post.findAll(testUtils.context.internal);
            })
            .then(function (results) {
                should.exist(results);
                results.length.should.equal(0);

                return models.Subscriber.findAll(testUtils.context.internal);
            })
            .then(function (results) {
                should.exist(results);
                results.length.should.equal(1);
            })
            .then(function () {
                eventsTriggered['post.unpublished'].length.should.eql(4);
                eventsTriggered['post.deleted'].length.should.eql(6);

                eventsTriggered['page.unpublished'].length.should.eql(1);
                eventsTriggered['page.deleted'].length.should.eql(2);

                eventsTriggered['tag.deleted'].length.should.eql(5);
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

    it('delete all content is denied (editor, author, contributor & without authentication)', function () {
        return dbAPI.deleteAllContent(testUtils.context.editor).then(function () {
            throw new Error('Delete all content is not denied for editor.');
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.deleteAllContent(testUtils.context.author);
        }).then(function () {
            throw new Error('Delete all content is not denied for author.');
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.deleteAllContent(testUtils.context.contributor);
        }).then(function () {
            throw new Error('Delete all content is not denied for contributor.');
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.deleteAllContent();
        }).then(function () {
            throw new Error('Delete all content is not denied without authentication.');
        }).catch(function (error) {
            error.errorType.should.eql('NoPermissionError');
        });
    });

    it('export content is denied (editor, author, contributor & without authentication)', function () {
        return dbAPI.exportContent(testUtils.context.editor).then(function () {
            throw new Error('Export content is not denied for editor.');
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.exportContent(testUtils.context.author);
        }).then(function () {
            throw new Error('Export content is not denied for author.');
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.exportContent(testUtils.context.contributor);
        }).then(function () {
            throw new Error('Export content is not denied for contributor.');
        }, function (error) {
            error.errorType.should.eql('NoPermissionError');
            return dbAPI.exportContent();
        }).then(function () {
            throw new Error('Export content is not denied without authentication.');
        }).catch(function (error) {
            error.errorType.should.eql('NoPermissionError');
        });
    });

    it('import content is denied (editor, author, contributor & without authentication)', function () {
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
            return dbAPI.importContent(_.extend(testUtils.context.contributor, file));
        }).then(function () {
            throw new Error('Import content is not denied for contributor.');
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
