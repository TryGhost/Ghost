const sinon = require('sinon');
const nock = require('nock');
const moment = require('moment');
const crypto = require('crypto');
const assert = require('node:assert/strict');
const logging = require('@tryghost/logging');
const request = require('@tryghost/request');
const UpdateCheckService = require('../../../../core/server/services/update-check/update-check-service');

describe('Update Check', function () {
    let settingsStub;
    let requestStub;

    beforeEach(function () {
        settingsStub = sinon.stub().resolves({
            settings: []
        });

        sinon.stub(logging, 'error');
        sinon.stub(logging, 'warn');

        requestStub = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    describe('UpdateCheck execution', function () {
        it('update check was executed', async function () {
            const scope = nock('https://updates.ghost.org')
                .get('/')
                .query(query => query.ghost_version === '0.8.0')
                .reply(200, JSON.stringify({
                    notifications: [],
                    next_check: moment().add(1, 'day').unix()
                }), {
                    'Content-Type': 'application/json'
                });

            const updateCheckService = new UpdateCheckService({
                api: {
                    settings: {
                        read: settingsStub,
                        edit: settingsStub
                    },
                    users: {
                        browse: sinon.stub().resolves()
                    }
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'https://localhost:2368/test',
                    ghostVersion: '0.8.0'
                },
                request: request
            });

            await updateCheckService.check();

            assert.equal(scope.isDone(), true);
        });

        it('update check won\'t happen if it\'s too early', async function () {
            const lateSettingStub = sinon.stub().resolves({
                settings: [{
                    value: moment().add('10', 'minutes').unix()
                }]
            });

            const updateCheckService = new UpdateCheckService({
                api: {
                    settings: {
                        read: lateSettingStub
                    }
                },
                config: {},
                request: requestStub
            });

            await updateCheckService.check();

            sinon.assert.notCalled(requestStub);
        });

        it('update check will happen if it\'s time to check', async function () {
            const updateCheckDelayPassed = sinon.stub().resolves({
                settings: [{
                    value: moment().subtract('10', 'minutes').unix()
                }]
            });

            const scope = nock('https://updates.ghost.org')
                .get('/')
                .query(query => query.ghost_version === '5.3.4')
                .reply(200, JSON.stringify({
                    notifications: [],
                    next_check: moment().add(1, 'day').unix()
                }), {
                    'Content-Type': 'application/json'
                });

            const updateCheckService = new UpdateCheckService({
                api: {
                    settings: {
                        read: updateCheckDelayPassed,
                        edit: settingsStub
                    },
                    users: {
                        browse: sinon.stub().resolves()
                    }
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'https://example.com',
                    ghostVersion: '5.3.4'
                },
                request: request
            });

            await updateCheckService.check();

            assert.equal(scope.isDone(), true);
        });
    });

    describe('Data sent with the request', function () {
        it('sends a GET with only the ghost_version and no site data', async function () {
            let capturedQuery;
            const postsBrowseStub = sinon.stub().resolves();
            const scope = nock('https://updates.ghost.org')
                .get('/')
                .query((query) => {
                    capturedQuery = query;
                    return true;
                })
                .reply(200, JSON.stringify({
                    notifications: [],
                    next_check: moment().add(1, 'day').unix()
                }), {
                    'Content-Type': 'application/json'
                });

            const updateCheckService = new UpdateCheckService({
                api: {
                    settings: {
                        read: settingsStub,
                        edit: settingsStub
                    },
                    users: {
                        browse: sinon.stub().resolves()
                    },
                    posts: {
                        browse: postsBrowseStub
                    }
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'https://localhost:2368/test',
                    ghostVersion: '4.0.0'
                },
                request: request
            });

            await updateCheckService.check();

            // A GET request was made (the GET interceptor matched)
            assert.equal(scope.isDone(), true);

            // Only the Ghost version is sent - no site data is collected
            assert.deepEqual({...capturedQuery}, {ghost_version: '4.0.0'});

            // No stats are gathered, so the posts API is never called
            sinon.assert.notCalled(postsBrowseStub);
        });

        it('emits structured logs around the request lifecycle', async function () {
            nock('https://updates.ghost.org')
                .get('/')
                .query(true)
                .reply(200, JSON.stringify({
                    notifications: [],
                    next_check: moment().add(1, 'day').unix()
                }), {
                    'Content-Type': 'application/json'
                });

            sinon.stub(logging, 'info');

            const updateCheckService = new UpdateCheckService({
                api: {
                    settings: {read: settingsStub, edit: settingsStub},
                    users: {browse: sinon.stub().resolves({users: []})}
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'https://localhost:2368/test',
                    ghostVersion: '4.0.0',
                    forceUpdate: true
                },
                request: request
            });

            await updateCheckService.check();

            sinon.assert.calledWith(logging.info, sinon.match({
                event: {name: 'update-check.check.start'},
                ghostVersion: '4.0.0',
                forceUpdate: true
            }));
            sinon.assert.calledWith(logging.info, sinon.match({
                event: {name: 'update-check.request.start'},
                endpoint: 'https://updates.ghost.org'
            }));
            sinon.assert.calledWith(logging.info, sinon.match({
                event: {name: 'update-check.request.complete'},
                statusCode: 200
            }));
            sinon.assert.calledWith(logging.info, sinon.match({
                event: {name: 'update-check.response.received'},
                notificationCount: 0
            }));
            sinon.assert.calledWith(logging.info, sinon.match({
                event: {name: 'update-check.check.complete'}
            }));
        });
    });

    describe('Notifications', function () {
        it('should create a release notification for target version', async function () {
            const notification = {
                id: 1,
                custom: 0,
                messages: [{
                    id: crypto.randomUUID(),
                    version: '999.9.x',
                    content: '<p>Hey there! This is for 999.9.0 version</p>',
                    dismissible: true,
                    top: true
                }]
            };

            nock('https://updates.ghost.org')
                .get('/')
                .query(true)
                .reply(200, JSON.stringify({
                    notifications: [notification]
                }), {
                    'Content-Type': 'application/json'
                });

            const notificationsAPIAddStub = sinon.stub().resolves();
            const usersBrowseStub = sinon.stub().resolves({
                users: [{
                    roles: [{
                        name: 'Owner'
                    }]
                }]
            });

            const updateCheckService = new UpdateCheckService({
                api: {
                    settings: {
                        read: settingsStub,
                        edit: settingsStub
                    },
                    users: {
                        browse: usersBrowseStub
                    },
                    notifications: {
                        add: notificationsAPIAddStub
                    }
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'https://localhost:2368/test',
                    ghostVersion: '0.8.0'
                },
                request: request
            });

            await updateCheckService.check();

            sinon.assert.calledOnce(notificationsAPIAddStub);
            assert.equal(notificationsAPIAddStub.args[0][0].notifications.length, 1);

            const targetNotification = notificationsAPIAddStub.args[0][0].notifications[0];
            assert.equal(targetNotification.dismissible, notification.messages[0].dismissible);
            assert.equal(targetNotification.id, notification.messages[0].id);
            assert.equal(targetNotification.top, notification.messages[0].top);
            assert.equal(targetNotification.type, 'info');
            assert.equal(targetNotification.message, notification.messages[0].content);

            // No site data is collected, so a non-alert notification never
            // triggers a users.browse - that only happens in the alert branch.
            sinon.assert.notCalled(usersBrowseStub);
        });

        it('preserves custom flag value from update check response', async function () {
            const notificationsAPIAddStub = sinon.stub().resolves();
            const usersBrowseStub = sinon.stub().resolves({
                users: [{
                    roles: [{
                        name: 'Owner'
                    }]
                }]
            });

            const updateCheckService = new UpdateCheckService({
                api: {
                    users: {
                        browse: usersBrowseStub
                    },
                    notifications: {
                        add: notificationsAPIAddStub
                    }
                },
                config: {
                    siteUrl: 'https://localhost:2368/test'
                },
                request: requestStub
            });

            await updateCheckService.createCustomNotification({
                custom: 0,
                messages: [{
                    id: crypto.randomUUID(),
                    content: '<p>hello</p>',
                    dismissible: true,
                    top: true
                }]
            });

            assert.equal(notificationsAPIAddStub.callCount, 1);
            const targetNotification = notificationsAPIAddStub.args[0][0].notifications[0];
            assert.equal(targetNotification.custom, 0);
        });

        it('should send an email for critical notification', async function () {
            const notification = {
                id: 1,
                messages: [{
                    id: crypto.randomUUID(),
                    version: 'custom1',
                    content: '<p>Critical message. Upgrade your site!</p>',
                    dismissible: false,
                    top: true,
                    type: 'alert'
                }]
            };

            nock('https://updates.ghost.org')
                .get('/')
                .query(true)
                .reply(200, JSON.stringify({notifications: [notification]}), {
                    'Content-Type': 'application/json'
                });

            const notificationsAPIAddStub = sinon.stub().resolves();
            const emailSendStub = sinon.stub().resolves();
            const usersBrowseStub = sinon.stub().resolves({
                users: [{
                    email: 'jbloggs@example.com',
                    roles: [{
                        name: 'Owner'
                    }]
                }]
            });

            const updateCheckService = new UpdateCheckService({
                api: {
                    settings: {
                        read: settingsStub,
                        edit: settingsStub
                    },
                    users: {
                        browse: usersBrowseStub
                    },
                    notifications: {
                        add: notificationsAPIAddStub
                    }
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'http://127.0.0.1:2369',
                    ghostVersion: '0.8.0'
                },
                request: request,
                notificationEmailService: {send: emailSendStub}
            });

            await updateCheckService.check();

            // users.browse is called once, in the alert branch, to look up
            // the admin recipients for the critical alert email.
            sinon.assert.calledOnce(usersBrowseStub);

            sinon.assert.calledOnce(emailSendStub);
            assert.deepEqual(emailSendStub.args[0][0].to, ['jbloggs@example.com']);
            assert.equal(emailSendStub.args[0][0].subject, 'Action required: Critical alert from Ghost instance http://127.0.0.1:2369');
            assert.equal(emailSendStub.args[0][0].content, '<p>Critical message. Upgrade your site!</p>');

            sinon.assert.calledOnce(notificationsAPIAddStub);
            const addedNotification = notificationsAPIAddStub.args[0][0].notifications[0];
            assert.equal(addedNotification.type, 'alert');
            assert.equal(addedNotification.message, '<p>Critical message. Upgrade your site!</p>');
        });

        it('not create a notification if the check response has no messages', async function () {
            nock('https://updates.ghost.org')
                .get('/')
                .query(true)
                .reply(200, JSON.stringify({
                    notifications: []
                }), {
                    'Content-Type': 'application/json'
                });

            const notificationsAPIAddStub = sinon.stub().resolves();

            const updateCheckService = new UpdateCheckService({
                api: {
                    settings: {
                        read: settingsStub,
                        edit: settingsStub
                    },
                    users: {
                        browse: sinon.stub().resolves({
                            users: [{
                                roles: [{
                                    name: 'Owner'
                                }]
                            }]
                        })
                    },
                    notifications: {
                        add: notificationsAPIAddStub
                    }
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'https://localhost:2368/test',
                    ghostVersion: '0.8.0'
                },
                request: request
            });

            await updateCheckService.check();

            sinon.assert.notCalled(notificationsAPIAddStub);
        });
    });

    describe('Response shapes', function () {
        const releaseNotification = {
            id: 1312,
            version: 'v6.44.1',
            messages: [{
                id: '0f17c191-87ab-46ad-8884-5d99aa3fdee8',
                version: '^6',
                content: 'Ghost v6.44.1 has been released.',
                top: false,
                dismissible: true,
                type: 'info'
            }],
            created_at: '2026-06-05T16:53:08.000Z',
            custom: false,
            next_check: 1781018713
        };

        const customNotification = {
            version: 'all-test',
            messages: [{
                id: 'all-test-msg',
                version: '^6',
                content: 'Critical security update.',
                top: true,
                dismissible: false,
                type: 'alert'
            }],
            created_at: '2026-06-04T21:15:00.000Z',
            custom: true,
            next_check: 1781018713
        };

        function makeService(notificationsAddStub) {
            return new UpdateCheckService({
                api: {
                    settings: {read: settingsStub, edit: settingsStub},
                    users: {
                        browse: sinon.stub().resolves({
                            users: [{email: 'a@b.c', roles: [{name: 'Owner'}]}]
                        })
                    },
                    notifications: {add: notificationsAddStub}
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'https://localhost:2368/test',
                    ghostVersion: '6.44.0'
                },
                request: request,
                notificationEmailService: {send: sinon.stub().resolves()}
            });
        }

        it('handles a bare-object response with messages at the top level', async function () {
            nock('https://updates.ghost.org')
                .get('/')
                .query(true)
                .reply(200, JSON.stringify(releaseNotification), {'Content-Type': 'application/json'});

            const addStub = sinon.stub().resolves();
            await makeService(addStub).check();

            sinon.assert.calledOnce(addStub);
            const added = addStub.firstCall.args[0].notifications[0];
            assert.equal(added.id, releaseNotification.messages[0].id);
            assert.equal(added.message, releaseNotification.messages[0].content);
        });

        it('handles a wrapped {notifications:[...]} response', async function () {
            nock('https://updates.ghost.org')
                .get('/')
                .query(true)
                .reply(200, JSON.stringify({
                    notifications: [releaseNotification, customNotification],
                    next_check: 1781018713
                }), {'Content-Type': 'application/json'});

            const addStub = sinon.stub().resolves();
            await makeService(addStub).check();

            sinon.assert.calledTwice(addStub);
        });

        it('handles a bare-array response', async function () {
            nock('https://updates.ghost.org')
                .get('/')
                .query(true)
                .reply(200, JSON.stringify([releaseNotification, customNotification]), {'Content-Type': 'application/json'});

            const addStub = sinon.stub().resolves();
            await makeService(addStub).check();

            sinon.assert.calledTwice(addStub);
        });
    });

    describe('Error handling', function () {
        it('logs an error when error', function () {
            const updateCheckService = new UpdateCheckService({
                api: {
                    settings: {
                        edit: settingsStub
                    }
                },
                config: {}
            });

            updateCheckService.updateCheckError({});

            sinon.assert.called(settingsStub);
            sinon.assert.called(logging.error);
            assert.equal(logging.error.args[0][0].err.context, 'Checking for updates failed, your site will continue to function.');
            assert.equal(logging.error.args[0][0].err.help, 'If you get this error repeatedly, please seek help from https://ghost.org/docs/');
        });

        it('logs and rethrows an error when error with rethrow configuration', function () {
            const updateCheckService = new UpdateCheckService({
                api: {
                    settings: {
                        edit: settingsStub
                    }
                },
                config: {
                    rethrowErrors: true
                }
            });

            try {
                updateCheckService.updateCheckError({});
                assert.fail('should have thrown');
            } catch (e) {
                sinon.assert.called(settingsStub);
                sinon.assert.called(logging.error);
                assert.equal(logging.error.args[0][0].err.context, 'Checking for updates failed, your site will continue to function.');
                assert.equal(logging.error.args[0][0].err.help, 'If you get this error repeatedly, please seek help from https://ghost.org/docs/');

                assert.equal(e.context, 'Checking for updates failed, your site will continue to function.');
            }
        });
    });
});
