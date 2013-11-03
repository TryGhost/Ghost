/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../unit/testUtils'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),
    _ = require('underscore'),
    GhostDatabase = require('../../../core/server/api/db');

describe('GhostDatabase', function () {

    var user = testUtils.DataGenerator.forModel.users[0],
        fakeGhost,
        fakeApi,
        db;

    before(function (done) {
        testUtils.clearData()
            .then(function () {
                done();
            }, done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultFixtures();
            })
            .then(function () {

                fakeGhost = {
                    notifications: {
                        add: sinon.stub()
                    }
                };

                fakeApi = {
                    settings: {
                        read: sinon.stub().returns(when.resolve({ value: '000' }))
                    }
                };
                
                db = new GhostDatabase(fakeGhost, fakeApi);

                done();
            }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it('can get the database version', function (done) {
        db.getVersion().then(function (databaseVersion) {
            should.exist(databaseVersion);

            databaseVersion.should.equal('000');

            done();
        }, done);
    });

    it('can import data', function (done) {
        var importData = {
            meta: {
                exported_at: Date.now(),
                version: '000'
            },
            data: {
                posts: [{
                    title: 'Imported Post 1',
                    html: 'Some <strong>content</strong> to import',
                    status: 'published'
                }]
            }
        };

        sinon.spy(db, 'getVersion');

        db._doDataImport = sinon.stub().returns(when.resolve());

        db.importJSONData(importData).then(function () {

            db.getVersion.called.should.equal(true);
            db._doDataImport.called.should.equal(true);

            // TODO: Verify we imported the posts

            done();
        }, done);
    });
});
