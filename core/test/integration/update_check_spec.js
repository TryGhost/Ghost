var _           = require('lodash'),
    testUtils   = require('../utils'),
    should      = require('should'),
    rewire      = require('rewire'),
    uuid        = require('node-uuid'),

    // Stuff we are testing
    packageInfo      = require('../../../package'),
    updateCheck      = rewire('../../server/update-check'),
    NotificationsAPI = require('../../server/api/notifications');

describe('Update Check', function () {
    describe('Reporting to UpdateCheck', function () {
        var environmentsOrig;

        before(function () {
            environmentsOrig = updateCheck.__get__('allowedCheckEnvironments');
            updateCheck.__set__('allowedCheckEnvironments', ['development', 'production', 'testing']);
        });

        after(function () {
            updateCheck.__set__('allowedCheckEnvironments', environmentsOrig);
        });

        beforeEach(testUtils.setup('owner', 'posts', 'perms:setting', 'perms:user', 'perms:init'));

        afterEach(testUtils.teardown);

        it('should report the correct data', function (done) {
            var updateCheckData = updateCheck.__get__('updateCheckData');

            updateCheckData().then(function (data) {
                should.exist(data);
                data.ghost_version.should.equal(packageInfo.version);
                data.node_version.should.equal(process.versions.node);
                data.env.should.equal(process.env.NODE_ENV);
                data.database_type.should.match(/sqlite3|pg|mysql/);
                data.blog_id.should.be.a.String();
                data.blog_id.should.not.be.empty();
                data.theme.should.be.equal('casper');
                data.apps.should.be.a.String();
                data.blog_created_at.should.be.a.Number();
                data.user_count.should.be.above(0);
                data.post_count.should.be.above(0);
                data.npm_version.should.be.a.String();
                data.npm_version.should.not.be.empty();

                done();
            }).catch(done);
        });
    });

    describe('Custom Notifications', function () {
        var currentVersionOrig;

        before(function () {
            currentVersionOrig = updateCheck.__get__('currentVersion');
            updateCheck.__set__('currentVersion', '0.9.0');
        });

        after(function () {
            updateCheck.__set__('currentVersion', currentVersionOrig);
        });

        beforeEach(testUtils.setup('owner', 'posts', 'settings', 'perms:setting', 'perms:notification', 'perms:user', 'perms:init'));

        afterEach(testUtils.teardown);

        it('should create a custom notification for target version', function (done) {
            var createCustomNotification = updateCheck.__get__('createCustomNotification'),
                message = {
                    id: uuid.v4(),
                    version: '0.9.x',
                    content: '<p>Hey there! This is for 0.9.0 version</p>'
                };

            createCustomNotification(message).then(function () {
                return NotificationsAPI.browse(testUtils.context.internal);
            }).then(function (results) {
                should.exist(results);
                should.exist(results.notifications);
                results.notifications.length.should.be.above(0);
                should.exist(_.find(results.notifications, {uuid: message.id}));
                done();
            }).catch(done);
        });

        it('should not create notifications meant for other versions', function (done) {
            var createCustomNotification = updateCheck.__get__('createCustomNotification'),
                message = {
                    id: uuid.v4(),
                    version: '0.5.x',
                    content: '<p>Hey there! This is for 0.5.0 version</p>'
                };

            createCustomNotification(message).then(function () {
                return NotificationsAPI.browse(testUtils.context.internal);
            }).then(function (results) {
                should.not.exist(_.find(results.notifications, {uuid: message.id}));
                done();
            }).catch(done);
        });
    });
});

