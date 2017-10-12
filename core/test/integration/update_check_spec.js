var _ = require('lodash'),
    Promise = require('bluebird'),
    should = require('should'),
    rewire = require('rewire'),
    sinon = require('sinon'),
    moment = require('moment'),
    uuid = require('uuid'),
    testUtils = require('../utils'),
    configUtils = require('../utils/configUtils'),

    // Stuff we are testing
    packageInfo = require('../../../package'),
    SettingsAPI = require('../../server/api/settings'),
    NotificationsAPI = require('../../server/api/notifications'),
    sandbox = sinon.sandbox.create(),
    updateCheck = rewire('../../server/update-check');

describe('Update Check', function () {
    beforeEach(function () {
        updateCheck = rewire('../../server/update-check');
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    describe('fn: updateCheck', function () {
        var updateCheckRequestSpy,
            updateCheckResponseSpy,
            updateCheckErrorSpy;

        beforeEach(testUtils.setup('owner', 'posts', 'perms:setting', 'perms:user', 'perms:init'));
        afterEach(testUtils.teardown);

        beforeEach(function () {
            updateCheckRequestSpy = sandbox.stub().returns(Promise.resolve());
            updateCheckResponseSpy = sandbox.stub().returns(Promise.resolve());
            updateCheckErrorSpy = sandbox.stub();

            updateCheck.__set__('updateCheckRequest', updateCheckRequestSpy);
            updateCheck.__set__('updateCheckResponse', updateCheckResponseSpy);
            updateCheck.__set__('updateCheckError', updateCheckErrorSpy);
            updateCheck.__set__('allowedCheckEnvironments', ['development', 'production', 'testing', 'testing-mysql', 'testing-pg']);
        });

        it('update check was never executed', function (done) {
            sandbox.stub(SettingsAPI, 'read').returns(Promise.resolve({
                settings: [{
                    value: null
                }]
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
            sandbox.stub(SettingsAPI, 'read').returns(Promise.resolve({
                settings: [{
                    value: moment().add('10', 'minutes').unix()
                }]
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
            sandbox.stub(SettingsAPI, 'read').returns(Promise.resolve({
                settings: [{
                    value: moment().subtract('10', 'minutes').unix()
                }]
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

    describe('fn: createCustomNotification', function () {
        var currentVersionOrig;

        before(function () {
            currentVersionOrig = updateCheck.__get__('currentVersion');
            updateCheck.__set__('currentVersion', '0.9.0');
        });

        after(function () {
            updateCheck.__set__('currentVersion', currentVersionOrig);
        });

        beforeEach(testUtils.setup('owner', 'posts', 'settings', 'perms:setting', 'perms:notification', 'perms:user', 'perms:init'));

        beforeEach(function () {
            return NotificationsAPI.destroyAll(testUtils.context.internal);
        });

        afterEach(testUtils.teardown);

        it('should create a release notification for target version', function (done) {
            var createCustomNotification = updateCheck.__get__('createCustomNotification'),
                message = {
                    id: uuid.v4(),
                    version: '0.9.x',
                    content: '<p>Hey there! This is for 0.9.0 version</p>',
                    dismissible: true,
                    top: true
                };

            createCustomNotification(message).then(function () {
                return NotificationsAPI.browse(testUtils.context.internal);
            }).then(function (results) {
                should.exist(results);
                should.exist(results.notifications);
                results.notifications.length.should.eql(1);

                var targetNotification = _.find(results.notifications, {id: message.id});
                should.exist(targetNotification);

                targetNotification.dismissible.should.eql(message.dismissible);
                targetNotification.id.should.eql(message.id);
                targetNotification.top.should.eql(message.top);
                targetNotification.type.should.eql('info');
                targetNotification.message.should.eql(message.content);
                done();
            }).catch(done);
        });

        it('should create a custom notification', function (done) {
            var createCustomNotification = updateCheck.__get__('createCustomNotification'),
                message = {
                    id: uuid.v4(),
                    version: 'custom1',
                    content: '<p>How about migrating your blog?</p>',
                    dismissible: false,
                    top: true,
                    type: 'warn'
                };

            createCustomNotification(message).then(function () {
                return NotificationsAPI.browse(testUtils.context.internal);
            }).then(function (results) {
                should.exist(results);
                should.exist(results.notifications);
                results.notifications.length.should.eql(1);

                var targetNotification = _.find(results.notifications, {id: message.id});
                should.exist(targetNotification);
                targetNotification.dismissible.should.eql(message.dismissible);
                targetNotification.top.should.eql(message.top);
                targetNotification.type.should.eql(message.type);
                done();
            }).catch(done);
        });

        it('should not add duplicates', function (done) {
            var createCustomNotification = updateCheck.__get__('createCustomNotification'),
                message = {
                    id: uuid.v4(),
                    version: 'custom1',
                    content: '<p>How about migrating your blog?</p>',
                    dismissible: false,
                    top: true,
                    type: 'warn'
                };

            createCustomNotification(message)
                .then(function () {
                    return NotificationsAPI.browse(testUtils.context.internal);
                })
                .then(function (results) {
                    should.exist(results);
                    should.exist(results.notifications);
                    results.notifications.length.should.eql(1);
                })
                .then(function () {
                    return createCustomNotification(message);
                })
                .then(function () {
                    return NotificationsAPI.browse(testUtils.context.internal);
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
        beforeEach(testUtils.setup('settings', 'perms:setting', 'perms:init'));
        afterEach(testUtils.teardown);

        /**
         * Receiving a notification without messages means that we shouldn't show anything.
         * Older Ghost versions always received a notification without messages, but Ghost did a check if
         * the current Ghost version is greater than the version in the notification.
         * If we stop sending a notification if there is no greater version available, older Ghost versions
         * wouldn't show anything. So we stick to this pattern. We could differentiate in the Update Check Service
         * which Ghost version requests the service and return a different response, but this has no priority.
         * e.g. send error "NoNotificationAvailable" for > 0.11.11.
         */
        it('receives a notification without messages', function (done) {
            var updateCheckResponse = updateCheck.__get__('updateCheckResponse'),
                createNotificationSpy = sandbox.spy();

            updateCheck.__set__('createCustomNotification', createNotificationSpy);

            updateCheckResponse({version: '0.11.12', messages: []})
                .then(function () {
                    createNotificationSpy.callCount.should.eql(0);
                    done();
                })
                .catch(done);
        });

        it('receives a notifications with messages', function (done) {
            var updateCheckResponse = updateCheck.__get__('updateCheckResponse'),
                createNotificationSpy = sandbox.spy(),
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
                createNotificationSpy = sandbox.spy(),
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
                createNotificationSpy = sandbox.spy(),
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
                createNotificationSpy = sandbox.spy(),
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
                createNotificationSpy = sandbox.spy(),
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
                createNotificationSpy = sandbox.spy(),
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
            configUtils.restore();
        });

        it('[default]', function (done) {
            var updateCheckRequest = updateCheck.__get__('updateCheckRequest'),
                updateCheckDataSpy = sandbox.stub(),
                reqObj,
                writeStub = sandbox.stub();

            updateCheck.__set__('https', {
                request: function (_reqObj, cb) {
                    reqObj = _reqObj;

                    return {
                        on: sandbox.stub(),
                        write: writeStub,
                        end: function () {
                            cb({
                                on: function (key, cb) {
                                    switch (key) {
                                        case 'data':
                                            cb(JSON.stringify({version: 'something'}));
                                            break;
                                        default:
                                            if (key === 'error') {
                                                return;
                                            }

                                            cb();
                                            break;
                                    }
                                },
                                statusCode: 200
                            });
                        }
                    };
                }
            });

            updateCheck.__set__('updateCheckData', updateCheckDataSpy);

            updateCheckDataSpy.returns(Promise.resolve({
                ghost_version: '0.11.11',
                blog_id: 'something',
                npm_version: 'something'
            }));

            updateCheckRequest()
                .then(function () {
                    reqObj.hostname.should.eql('updates.ghost.org');
                    reqObj.method.should.eql('POST');
                    should.exist(reqObj.headers['Content-Length']);
                    should.not.exist(reqObj.path);
                    should.not.exist(reqObj.port);
                    writeStub.called.should.eql(true);
                    writeStub.args[0][0].should.eql('{"ghost_version":"0.11.11","blog_id":"something","npm_version":"something"}');
                    done();
                })
                .catch(done);
        });

        it('privacy flag is used', function (done) {
            var updateCheckRequest = updateCheck.__get__('updateCheckRequest'),
                updateCheckDataSpy = sandbox.stub(),
                reqObj,
                writeStub = sandbox.stub();

            configUtils.set({
                privacy: {
                    useUpdateCheck: false
                }
            });

            updateCheck.__set__('https', {
                request: function (_reqObj, cb) {
                    reqObj = _reqObj;

                    return {
                        on: sandbox.stub(),
                        write: writeStub,
                        end: function () {
                            cb({
                                on: function (key, cb) {
                                    switch (key) {
                                        case 'data':
                                            cb(JSON.stringify({version: 'something'}));
                                            break;
                                        default:
                                            if (key === 'error') {
                                                return;
                                            }

                                            cb();
                                            break;
                                    }
                                },
                                statusCode: 200
                            });
                        }
                    };
                }
            });

            updateCheck.__set__('updateCheckData', updateCheckDataSpy);

            updateCheckDataSpy.returns(Promise.resolve({
                ghost_version: '0.11.11',
                blog_id: 'something',
                npm_version: 'something'
            }));

            updateCheckRequest()
                .then(function () {
                    reqObj.hostname.should.eql('updates.ghost.org');
                    should.not.exist(reqObj.port);
                    reqObj.method.should.eql('GET');
                    reqObj.path.should.eql('/?ghost_version=0.11.11');
                    writeStub.called.should.eql(false);
                    done();
                })
                .catch(done);
        });

        it('received 500 from the service', function (done) {
            var updateCheckRequest = updateCheck.__get__('updateCheckRequest'),
                updateCheckDataSpy = sandbox.stub(),
                reqObj,
                writeStub = sandbox.stub();

            updateCheck.__set__('https', {
                request: function (_reqObj, cb) {
                    reqObj = _reqObj;

                    return {
                        on: sandbox.stub(),
                        write: writeStub,
                        end: function () {
                            cb({
                                on: function (key, cb) {
                                    switch (key) {
                                        case 'data':
                                            cb('something went wrong');
                                            break;
                                        default:
                                            if (key === 'error') {
                                                return;
                                            }

                                            cb();
                                            break;
                                    }
                                },
                                statusCode: 500
                            });
                        }
                    };
                }
            });

            updateCheck.__set__('updateCheckData', updateCheckDataSpy);

            updateCheckDataSpy.returns(Promise.resolve({
                ghost_version: '0.11.11',
                blog_id: 'something',
                npm_version: 'something'
            }));

            updateCheckRequest()
                .then(function () {
                    done(new Error('Should fail.'));
                })
                .catch(function (err) {
                    err.message.should.eql('Unable to decode update response:something went wrong');
                    done();
                });
        });

        it('received 404 from the service', function (done) {
            var updateCheckRequest = updateCheck.__get__('updateCheckRequest'),
                updateCheckDataSpy = sandbox.stub(),
                reqObj,
                writeStub = sandbox.stub();

            updateCheck.__set__('https', {
                request: function (_reqObj, cb) {
                    reqObj = _reqObj;

                    return {
                        on: sandbox.stub(),
                        write: writeStub,
                        end: function () {
                            cb({
                                on: function (key, cb) {
                                    switch (key) {
                                        case 'data':
                                            cb(JSON.stringify({errors: [{detail: 'No Notifications available.'}]}));
                                            break;
                                        default:
                                            if (key === 'error') {
                                                return;
                                            }

                                            cb();
                                            break;
                                    }
                                },
                                statusCode: 404
                            });
                        }
                    };
                }
            });

            updateCheck.__set__('updateCheckData', updateCheckDataSpy);

            updateCheckDataSpy.returns(Promise.resolve({
                ghost_version: '0.11.11',
                blog_id: 'something',
                npm_version: 'something'
            }));

            updateCheckRequest()
                .then(function () {
                    reqObj.hostname.should.eql('updates.ghost.org');
                    should.not.exist(reqObj.port);
                    reqObj.method.should.eql('POST');
                    writeStub.called.should.eql(true);
                    done();
                })
                .catch(done);
        });

        it('custom url', function (done) {
            var updateCheckRequest = updateCheck.__get__('updateCheckRequest'),
                updateCheckDataSpy = sandbox.stub(),
                reqObj,
                writeStub = sandbox.stub();

            configUtils.set({
                updateCheckUrl: 'http://localhost:3000'
            });

            updateCheck.__set__('http', {
                request: function (_reqObj, cb) {
                    reqObj = _reqObj;

                    return {
                        on: sandbox.stub(),
                        write: writeStub,
                        end: function () {
                            cb({
                                on: function (key, cb) {
                                    switch (key) {
                                        case 'data':
                                            cb(JSON.stringify({version: 'something'}));
                                            break;
                                        default:
                                            if (key === 'error') {
                                                return;
                                            }

                                            cb();
                                            break;
                                    }
                                },
                                statusCode: 200
                            });
                        }
                    };
                }
            });

            updateCheck.__set__('updateCheckData', updateCheckDataSpy);

            updateCheckDataSpy.returns(Promise.resolve({
                ghost_version: '0.11.11',
                blog_id: 'something',
                npm_version: 'something'
            }));

            updateCheckRequest()
                .then(function () {
                    reqObj.hostname.should.eql('localhost');
                    reqObj.port.should.eql('3000');
                    reqObj.method.should.eql('POST');
                    should.exist(reqObj.headers['Content-Length']);
                    should.not.exist(reqObj.path);
                    writeStub.called.should.eql(true);
                    writeStub.args[0][0].should.eql('{"ghost_version":"0.11.11","blog_id":"something","npm_version":"something"}');
                    done();
                })
                .catch(done);
        });
    });
});

