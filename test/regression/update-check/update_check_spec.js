const _ = require('lodash');
const Promise = require('bluebird');
const should = require('should');
const rewire = require('rewire');
const sinon = require('sinon');
const moment = require('moment');
const uuid = require('uuid');
const testUtils = require('../../utils');
const configUtils = require('../../utils/configUtils');
const packageInfo = require('../../../package.json');
const api = require('../../../core/server/api').v2;

let updateCheck = rewire('../../../core/server/update-check');
let NotificationsAPI = rewire('../../../core/server/api/v2/notifications');

describe('Update Check', function () {
    beforeEach(function () {
        updateCheck = rewire('../../../core/server/update-check');
        NotificationsAPI = rewire('../../../core/server/api/v2/notifications');
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
    });

    after(testUtils.teardownDb);

    describe('fn: updateCheck', function () {
        var updateCheckRequestSpy,
            updateCheckResponseSpy,
            updateCheckErrorSpy;

        beforeEach(testUtils.teardownDb);
        beforeEach(testUtils.setup('roles', 'owner'));

        beforeEach(function () {
            updateCheckRequestSpy = sinon.stub().returns(Promise.resolve());
            updateCheckResponseSpy = sinon.stub().returns(Promise.resolve());
            updateCheckErrorSpy = sinon.stub();

            updateCheck.__set__('updateCheckRequest', updateCheckRequestSpy);
            updateCheck.__set__('updateCheckResponse', updateCheckResponseSpy);
            updateCheck.__set__('updateCheckError', updateCheckErrorSpy);
            updateCheck.__set__('allowedCheckEnvironments', ['development', 'production', 'testing', 'testing-mysql']);
        });

        it('update check was never executed', function (done) {
            const readStub = sinon.stub().resolves({
                settings: [{
                    value: null
                }]
            });
            sinon.stub(api, 'settings').get(() => ({
                read: readStub
            }));

            updateCheck()
                .then(function () {
                    updateCheckRequestSpy.calledOnce.should.eql(true);
                    updateCheckResponseSpy.calledOnce.should.eql(true);
                    updateCheckErrorSpy.called.should.eql(false);
                    done();
                })
                .catch(done);
        });

        it('update check won\'t happen if it\'s too early', function (done) {
            const readStub = sinon.stub().resolves({
                settings: [{
                    value: moment().add('10', 'minutes').unix()
                }]
            });
            sinon.stub(api, 'settings').get(() => ({
                read: readStub
            }));

            updateCheck()
                .then(function () {
                    updateCheckRequestSpy.calledOnce.should.eql(false);
                    updateCheckResponseSpy.calledOnce.should.eql(false);
                    updateCheckErrorSpy.called.should.eql(false);
                    done();
                })
                .catch(done);
        });

        it('update check will happen if it\'s time to check', function (done) {
            const readStub = sinon.stub().resolves({
                settings: [{
                    value: moment().subtract('10', 'minutes').unix()
                }]
            });
            sinon.stub(api, 'settings').get(() => ({
                read: readStub
            }));

            updateCheck()
                .then(function () {
                    updateCheckRequestSpy.calledOnce.should.eql(true);
                    updateCheckResponseSpy.calledOnce.should.eql(true);
                    updateCheckErrorSpy.called.should.eql(false);
                    done();
                })
                .catch(done);
        });
    });

    describe('fn: updateCheckData', function () {
        var environmentsOrig;

        before(function () {
            configUtils.set('privacy:useUpdateCheck', true);
        });

        after(function () {
            configUtils.restore();
        });

        beforeEach(testUtils.teardownDb);
        beforeEach(testUtils.setup('roles', 'owner', 'settings', 'posts', 'perms:setting', 'perms:user', 'perms:init'));

        it('should report the correct data', function (done) {
            var updateCheckData = updateCheck.__get__('updateCheckData');

            updateCheckData().then(function (data) {
                should.exist(data);
                data.ghost_version.should.equal(packageInfo.version);
                data.node_version.should.equal(process.versions.node);
                data.env.should.equal(process.env.NODE_ENV);
                data.database_type.should.match(/sqlite3|mysql/);
                data.blog_id.should.be.a.String();
                data.blog_id.should.not.be.empty();
                data.theme.should.be.equal('casper');
                data.blog_created_at.should.be.a.Number();
                data.user_count.should.be.above(0);
                data.post_count.should.be.above(0);
                data.npm_version.should.be.a.String();
                data.npm_version.should.not.be.empty();

                done();
            }).catch(done);
        });
    });

    describe('fn: createCustomNotification', function () {
        var currentVersionOrig;

        before(function () {
            currentVersionOrig = updateCheck.__get__('ghostVersion.original');
            updateCheck.__set__('ghostVersion.original', '0.9.0');
        });

        after(function () {
            updateCheck.__set__('ghostVersion.original', currentVersionOrig);
        });

        beforeEach(testUtils.teardownDb);
        beforeEach(testUtils.setup('settings', 'roles', 'owner', 'perms:setting', 'perms:notification', 'perms:user', 'perms:init'));

        beforeEach(function () {
            return api.notifications.destroyAll(testUtils.context.internal);
        });

        it('should create a release notification for target version', function (done) {
            var createCustomNotification = updateCheck.__get__('createCustomNotification'),
                notification = {
                    id: 1,
                    custom: 0,
                    messages: [{
                        id: uuid.v4(),
                        version: '0.9.x',
                        content: '<p>Hey there! This is for 0.9.0 version</p>',
                        dismissible: true,
                        top: true
                    }]
                };

            NotificationsAPI.__set__('ghostVersion.full', '0.8.1');

            createCustomNotification(notification).then(function () {
                return api.notifications.browse(testUtils.context.internal);
            }).then(function (results) {
                should.exist(results);
                should.exist(results.notifications);
                results.notifications.length.should.eql(1);

                var targetNotification = _.find(results.notifications, {id: notification.messages[0].id});
                should.exist(targetNotification);

                targetNotification.dismissible.should.eql(notification.messages[0].dismissible);
                targetNotification.id.should.eql(notification.messages[0].id);
                targetNotification.top.should.eql(notification.messages[0].top);
                targetNotification.type.should.eql('info');
                targetNotification.message.should.eql(notification.messages[0].content);
                done();
            }).catch(done);
        });

        it('release notification version format is wrong', function (done) {
            var createCustomNotification = updateCheck.__get__('createCustomNotification'),
                notification = {
                    id: 1,
                    custom: 0,
                    messages: [{
                        id: uuid.v4(),
                        version: '0.9.x',
                        content: '<p>Hey there! This is for 0.9 version</p>',
                        dismissible: true,
                        top: true
                    }]
                };

            NotificationsAPI.__set__('ghostVersion.full', '0.8.1');

            createCustomNotification(notification).then(function () {
                return api.notifications.browse(testUtils.context.internal);
            }).then(function (results) {
                should.exist(results);
                should.exist(results.notifications);
                results.notifications.length.should.eql(0);
                done();
            }).catch(done);
        });

        it('blog version format is wrong', function (done) {
            var createCustomNotification = updateCheck.__get__('createCustomNotification'),
                notification = {
                    id: 1,
                    custom: 0,
                    messages: [{
                        id: uuid.v4(),
                        version: '0.9.x',
                        content: '<p>Hey there! This is for 0.9.0 version</p>',
                        dismissible: true,
                        top: true
                    }]
                };

            NotificationsAPI.__set__('ghostVersion.full', '0.8');

            createCustomNotification(notification).then(function () {
                return api.notifications.browse(testUtils.context.internal);
            }).then(function (results) {
                should.exist(results);
                should.exist(results.notifications);
                results.notifications.length.should.eql(0);
                done();
            }).catch(done);
        });

        it('should create a custom notification', function (done) {
            var createCustomNotification = updateCheck.__get__('createCustomNotification'),
                notification = {
                    id: 1,
                    custom: 1,
                    messages: [{
                        id: uuid.v4(),
                        version: 'custom1',
                        content: '<p>How about migrating your blog?</p>',
                        dismissible: false,
                        top: true,
                        type: 'warn'
                    }]
                };

            createCustomNotification(notification).then(function () {
                return api.notifications.browse(testUtils.context.internal);
            }).then(function (results) {
                should.exist(results);
                should.exist(results.notifications);
                results.notifications.length.should.eql(1);

                var targetNotification = _.find(results.notifications, {id: notification.messages[0].id});
                should.exist(targetNotification);
                targetNotification.dismissible.should.eql(notification.messages[0].dismissible);
                targetNotification.top.should.eql(notification.messages[0].top);
                targetNotification.type.should.eql(notification.messages[0].type);
                done();
            }).catch(done);
        });

        it('should not add duplicates', function (done) {
            var createCustomNotification = updateCheck.__get__('createCustomNotification'),
                notification = {
                    id: 1,
                    custom: 1,
                    messages: [{
                        id: uuid.v4(),
                        version: 'custom1',
                        content: '<p>How about migrating your blog?</p>',
                        dismissible: false,
                        top: true,
                        type: 'warn'
                    }]
                };

            createCustomNotification(notification)
                .then(function () {
                    return api.notifications.browse(testUtils.context.internal);
                })
                .then(function (results) {
                    should.exist(results);
                    should.exist(results.notifications);
                    results.notifications.length.should.eql(1);
                })
                .then(function () {
                    return createCustomNotification(notification);
                })
                .then(function () {
                    return api.notifications.browse(testUtils.context.internal);
                })
                .then(function (results) {
                    should.exist(results);
                    should.exist(results.notifications);
                    results.notifications.length.should.eql(1);
                    done();
                })
                .catch(done);
        });
    });

    describe('fn: updateCheckResponse', function () {
        beforeEach(testUtils.teardownDb);
        beforeEach(testUtils.setup('roles', 'settings', 'perms:setting', 'perms:init'));

        it('receives a notifications with messages', function (done) {
            var updateCheckResponse = updateCheck.__get__('updateCheckResponse'),
                createNotificationSpy = sinon.spy(),
                message = {
                    id: uuid.v4(),
                    version: '^0.11.11',
                    content: 'Test',
                    dismissible: true,
                    top: true
                };

            updateCheck.__set__('createCustomNotification', createNotificationSpy);

            updateCheckResponse({version: '0.11.12', messages: [message]})
                .then(function () {
                    createNotificationSpy.callCount.should.eql(1);
                    done();
                })
                .catch(done);
        });

        it('receives multiple notifications', function (done) {
            var updateCheckResponse = updateCheck.__get__('updateCheckResponse'),
                createNotificationSpy = sinon.spy(),
                message1 = {
                    id: uuid.v4(),
                    version: '^0.11.11',
                    content: 'Test1',
                    dismissible: true,
                    top: true
                },
                message2 = {
                    id: uuid.v4(),
                    version: '^0',
                    content: 'Test2',
                    dismissible: true,
                    top: false
                },
                notifications = [
                    {version: '0.11.12', messages: [message1]},
                    {version: 'custom1', messages: [message2]}
                ];

            updateCheck.__set__('createCustomNotification', createNotificationSpy);

            updateCheckResponse(notifications)
                .then(function () {
                    createNotificationSpy.callCount.should.eql(2);
                    done();
                })
                .catch(done);
        });

        it('ignores some custom notifications which are not marked as group', function (done) {
            var updateCheckResponse = updateCheck.__get__('updateCheckResponse'),
                createNotificationSpy = sinon.spy(),
                message1 = {
                    id: uuid.v4(),
                    version: '^0.11.11',
                    content: 'Test1',
                    dismissible: true,
                    top: true
                },
                message2 = {
                    id: uuid.v4(),
                    version: '^0',
                    content: 'Test2',
                    dismissible: true,
                    top: false
                },
                message3 = {
                    id: uuid.v4(),
                    version: '^0',
                    content: 'Test2',
                    dismissible: true,
                    top: false
                },
                notifications = [
                    {version: '0.11.12', messages: [message1]},
                    {version: 'all1', messages: [message2], custom: 1},
                    {version: 'migration1', messages: [message3], custom: 1}
                ];

            updateCheck.__set__('createCustomNotification', createNotificationSpy);

            updateCheckResponse(notifications)
                .then(function () {
                    createNotificationSpy.callCount.should.eql(2);
                    done();
                })
                .catch(done);
        });

        it('group matches', function (done) {
            var updateCheckResponse = updateCheck.__get__('updateCheckResponse'),
                createNotificationSpy = sinon.spy(),
                message1 = {
                    id: uuid.v4(),
                    version: '^0.11.11',
                    content: 'Test1',
                    dismissible: true,
                    top: true
                },
                message2 = {
                    id: uuid.v4(),
                    version: '^0',
                    content: 'Test2',
                    dismissible: true,
                    top: false
                },
                message3 = {
                    id: uuid.v4(),
                    version: '^0',
                    content: 'Test2',
                    dismissible: true,
                    top: false
                },
                notifications = [
                    {version: '0.11.12', messages: [message1], custom: 0},
                    {version: 'all1', messages: [message2], custom: 1},
                    {version: 'migration1', messages: [message3], custom: 1}
                ];

            updateCheck.__set__('createCustomNotification', createNotificationSpy);

            configUtils.set({notificationGroups: ['migration']});

            updateCheckResponse(notifications)
                .then(function () {
                    createNotificationSpy.callCount.should.eql(3);
                    done();
                })
                .catch(done);
        });

        it('single custom notification received, group matches', function (done) {
            var updateCheckResponse = updateCheck.__get__('updateCheckResponse'),
                createNotificationSpy = sinon.spy(),
                message1 = {
                    id: uuid.v4(),
                    version: '^0.11.11',
                    content: 'Custom',
                    dismissible: true,
                    top: true
                },
                notifications = [
                    {version: 'something', messages: [message1], custom: 1}
                ];

            updateCheck.__set__('createCustomNotification', createNotificationSpy);

            configUtils.set({notificationGroups: ['something']});

            updateCheckResponse(notifications)
                .then(function () {
                    createNotificationSpy.callCount.should.eql(1);
                    done();
                })
                .catch(done);
        });

        it('single custom notification received, group does not match', function (done) {
            var updateCheckResponse = updateCheck.__get__('updateCheckResponse'),
                createNotificationSpy = sinon.spy(),
                message1 = {
                    id: uuid.v4(),
                    version: '^0.11.11',
                    content: 'Custom',
                    dismissible: true,
                    top: true
                },
                notifications = [
                    {version: 'something', messages: [message1], custom: 1}
                ];

            updateCheck.__set__('createCustomNotification', createNotificationSpy);

            configUtils.set({notificationGroups: ['migration']});

            updateCheckResponse(notifications)
                .then(function () {
                    createNotificationSpy.callCount.should.eql(0);
                    done();
                })
                .catch(done);
        });
    });

    describe('fn: updateCheckRequest', function () {
        beforeEach(function () {
            configUtils.set('privacy:useUpdateCheck', true);
        });

        afterEach(function () {
            configUtils.restore();
        });

        it('[default]', function () {
            var updateCheckRequest = updateCheck.__get__('updateCheckRequest'),
                updateCheckDataSpy = sinon.stub(),
                hostname,
                reqObj,
                data = {
                    ghost_version: '0.11.11',
                    blog_id: 'something',
                    npm_version: 'something'
                };

            updateCheck.__set__('request', function (_hostname, _reqObj) {
                hostname = _hostname;
                reqObj = _reqObj;

                return Promise.resolve({
                    statusCode: 200,
                    body: {version: 'something'}
                });
            });

            updateCheck.__set__('updateCheckData', updateCheckDataSpy);

            updateCheckDataSpy.returns(Promise.resolve(data));

            return updateCheckRequest()
                .then(function () {
                    hostname.should.eql('https://updates.ghost.org');
                    should.exist(reqObj.headers['Content-Length']);
                    reqObj.body.should.eql(data);
                    reqObj.json.should.eql(true);
                });
        });

        it('privacy flag is used', function () {
            var updateCheckRequest = updateCheck.__get__('updateCheckRequest'),
                updateCheckDataSpy = sinon.stub(),
                reqObj,
                hostname;

            configUtils.set({
                privacy: {
                    useUpdateCheck: false
                }
            });

            updateCheck.__set__('request', function (_hostname, _reqObj) {
                hostname = _hostname;
                reqObj = _reqObj;

                return Promise.resolve({
                    statusCode: 200,
                    body: {version: 'something'}
                });
            });

            updateCheck.__set__('updateCheckData', updateCheckDataSpy);

            updateCheckDataSpy.returns(Promise.resolve({
                ghost_version: '0.11.11',
                blog_id: 'something',
                npm_version: 'something'
            }));

            return updateCheckRequest()
                .then(function () {
                    hostname.should.eql('https://updates.ghost.org');
                    reqObj.query.should.eql({
                        ghost_version: '0.11.11'
                    });

                    should.not.exist(reqObj.body);
                    reqObj.json.should.eql(true);
                    should.not.exist(reqObj.headers['Content-Length']);
                });
        });

        it('received 500 from the service', function () {
            var updateCheckRequest = updateCheck.__get__('updateCheckRequest'),
                updateCheckDataSpy = sinon.stub(),
                reqObj,
                hostname;

            updateCheck.__set__('request', function (_hostname, _reqObj) {
                hostname = _hostname;
                reqObj = _reqObj;

                return Promise.reject({
                    statusCode: 500,
                    message: 'something went wrong'
                });
            });

            updateCheck.__set__('updateCheckData', updateCheckDataSpy);

            updateCheckDataSpy.returns(Promise.resolve({
                ghost_version: '0.11.11',
                blog_id: 'something',
                npm_version: 'something'
            }));

            return updateCheckRequest()
                .then(function () {
                    throw new Error('Should fail.');
                })
                .catch(function (err) {
                    err.message.should.eql('something went wrong');
                });
        });

        it('received 404 from the service', function () {
            var updateCheckRequest = updateCheck.__get__('updateCheckRequest'),
                updateCheckDataSpy = sinon.stub(),
                reqObj,
                hostname;

            updateCheck.__set__('request', function (_hostname, _reqObj) {
                hostname = _hostname;
                reqObj = _reqObj;

                return Promise.reject({
                    statusCode: 404,
                    response: {
                        body: {
                            errors: [{detail: 'No Notifications available.'}]
                        }
                    }
                });
            });

            updateCheck.__set__('updateCheckData', updateCheckDataSpy);

            updateCheckDataSpy.returns(Promise.resolve({
                ghost_version: '0.11.11',
                blog_id: 'something',
                npm_version: 'something'
            }));

            return updateCheckRequest()
                .then(function () {
                    hostname.should.eql('https://updates.ghost.org');
                });
        });

        it('custom url', function () {
            var updateCheckRequest = updateCheck.__get__('updateCheckRequest'),
                updateCheckDataSpy = sinon.stub(),
                reqObj,
                hostname;

            configUtils.set({
                updateCheck: {
                    url: 'http://localhost:3000'
                }
            });

            updateCheck.__set__('request', function (_hostname, _reqObj) {
                hostname = _hostname;
                reqObj = _reqObj;

                return Promise.resolve({
                    statusCode: 200,
                    body: {
                        version: 'something'
                    }
                });
            });

            updateCheck.__set__('updateCheckData', updateCheckDataSpy);

            updateCheckDataSpy.returns(Promise.resolve({
                ghost_version: '0.11.11',
                blog_id: 'something',
                npm_version: 'something'
            }));

            return updateCheckRequest()
                .then(function () {
                    hostname.should.eql('http://localhost:3000');
                });
        });
    });
});
