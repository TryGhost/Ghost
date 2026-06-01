const sinon = require('sinon');
const nock = require('nock');
const moment = require('moment');
const crypto = require('crypto');
const assert = require('node:assert/strict');
const util = require('util');
const logging = require('@tryghost/logging');
const request = require('@tryghost/request');
const UpdateCheckService = require('../../../../core/server/services/update-check/update-check-service');

describe('Update Check', function () {
    const internal = {context: {internal: true}};
    let settingsStub;
    let requestStub;

    beforeEach(function () {
        settingsStub = sinon.stub().resolves({
            settings: []
        });
        settingsStub.withArgs(Object.assign({key: 'db_hash'}, internal)).resolves({
            settings: [{
                value: 'dummy_db_hash'
            }]
        });
        settingsStub.withArgs(Object.assign({key: 'active_theme'}, internal)).resolves({
            settings: [{
                value: 'casperito'
            }]
        });

        sinon.stub(util, 'promisify').returns(async () => ({
            stdout: '10.8.2'
        }));

        sinon.stub(logging, 'error');

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
                    },
                    posts: {
                        browse: sinon.stub().resolves()
                    }
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'https://localhost:2368/test',
                    isPrivacyDisabled: true,
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
                    },
                    posts: {
                        browse: sinon.stub().resolves()
                    }
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'https://example.com',
                    isPrivacyDisabled: true,
                    ghostVersion: '5.3.4'
                },
                request: request
            });

            await updateCheckService.check();

            assert.equal(scope.isDone(), true);
        });
    });

    describe('Data sent with the POST request', function () {
        it('should report the correct data', async function () {
            let capturedData;
            const scope = nock('https://updates.ghost.org')
                .post('/', (body) => {
                    capturedData = body;
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
                        browse: sinon.stub().resolves({
                            users: [{
                                created_at: '1995-12-24T23:15:00Z',
                                roles: [{
                                    name: 'Owner'
                                }]
                            }, {}]
                        })
                    },
                    posts: {
                        browse: sinon.stub().resolves({
                            meta: {
                                pagination: {
                                    total: 13
                                }
                            }
                        })
                    }
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'https://localhost:2368/test',
                    isPrivacyDisabled: false,
                    env: process.env.NODE_ENV,
                    databaseType: 'mysql',
                    ghostVersion: '4.0.0'
                },
                request: request,
                ghostMailer: {
                    send: sinon.stub().resolves()
                }
            });

            await updateCheckService.check();

            assert.equal(scope.isDone(), true);

            assert.equal(capturedData.ghost_version, '4.0.0');
            assert.equal(capturedData.node_version, process.versions.node);
            assert.equal(capturedData.env, process.env.NODE_ENV);
            assert.match(capturedData.database_type, /sqlite3|mysql/);
            assert.equal(typeof capturedData.blog_id, 'string');
            assert(capturedData.blog_id);
            assert.equal(capturedData.theme, 'casperito');
            assert.equal(capturedData.blog_created_at, 819846900);
            assert.equal(capturedData.user_count, 2);
            assert.equal(capturedData.post_count, 13);
            assert.equal(capturedData.npm_version, '10.8.2');
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
                    posts: {
                        browse: sinon.stub().resolves()
                    },
                    notifications: {
                        add: notificationsAPIAddStub
                    }
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'https://localhost:2368/test',
                    isPrivacyDisabled: true,
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

            // users.browse is called once here, for stats reporting: this
            // notification is non-alert, so the admin-lookup query in the
            // alert branch never runs.
            sinon.assert.calledOnce(usersBrowseStub);
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
                .reply(200, JSON.stringify([notification]), {
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
                    posts: {
                        browse: sinon.stub().resolves()
                    },
                    notifications: {
                        add: notificationsAPIAddStub
                    }
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'http://127.0.0.1:2369',
                    isPrivacyDisabled: true,
                    ghostVersion: '0.8.0'
                },
                request: request,
                notificationEmailService: {send: emailSendStub}
            });

            await updateCheckService.check();

            sinon.assert.calledOnce(emailSendStub);
            assert.deepEqual(emailSendStub.args[0][0].to, ['jbloggs@example.com']);
            assert.equal(emailSendStub.args[0][0].subject, 'Action required: Critical alert from Ghost instance http://127.0.0.1:2369');
            assert.equal(emailSendStub.args[0][0].content, '<p>Critical message. Upgrade your site!</p>');

            // users.browse is called twice: once for stats reporting, once for
            // the admin lookup. The second call pushes the role filter into
            // NQL so the DB returns only Owner/Administrator users.
            sinon.assert.calledTwice(usersBrowseStub);
            assert.deepEqual(usersBrowseStub.args[1][0], {
                filter: 'status:active+roles.name:[Owner,Administrator]',
                context: {internal: true}
            });

            sinon.assert.calledOnce(notificationsAPIAddStub);
            assert.equal(notificationsAPIAddStub.args[0][0].notifications.length, 1);
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
                    posts: {
                        browse: sinon.stub().resolves()
                    },
                    notifications: {
                        add: notificationsAPIAddStub
                    }
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'https://localhost:2368/test',
                    isPrivacyDisabled: true,
                    ghostVersion: '0.8.0'
                },
                request: request
            });

            await updateCheckService.check();

            sinon.assert.notCalled(notificationsAPIAddStub);
        });
    });

    describe('Channels dispatch', function () {
        // Helper: build an UpdateCheckService wired with the stubs we want
        // to inspect per test. Mirrors the setup in the surrounding suite
        // but lets each test choose the response body shape via nock.
        function makeService({notificationsAPIAddStub, emailSendStub, usersBrowseStub}) {
            return new UpdateCheckService({
                api: {
                    settings: {
                        read: settingsStub,
                        edit: settingsStub
                    },
                    users: {
                        browse: usersBrowseStub
                    },
                    posts: {
                        browse: sinon.stub().resolves()
                    },
                    notifications: {
                        add: notificationsAPIAddStub
                    }
                },
                config: {
                    checkEndpoint: 'https://updates.ghost.org',
                    siteUrl: 'http://127.0.0.1:2369',
                    isPrivacyDisabled: true,
                    ghostVersion: '0.8.0'
                },
                request,
                notificationEmailService: {send: emailSendStub}
            });
        }

        function adminUsersStub(emails = ['admin@example.com']) {
            return sinon.stub().resolves({
                users: emails.map(email => ({
                    email,
                    roles: [{name: 'Owner'}]
                }))
            });
        }

        it('routes a banner+email channels notification to both surfaces with distinct content', async function () {
            const notification = {
                id: 'ghsa-XXX',
                version: 'ghsa-XXX',
                target: {ghost_versions: '<=6.19.0'},
                channels: {
                    banner: {
                        content: '<strong>Critical Ghost security update available.</strong>',
                        dismissible: false,
                        top: true
                    },
                    email: {
                        subject: 'Critical Ghost security update',
                        content: '<p>Hi there,</p><p>Full advisory body...</p>'
                    }
                },
                // Legacy shim from new UpdateChecker — dispatcher must
                // ignore this when channels is present, because channels is
                // first-party.
                messages: [{
                    id: 'legacy-msg',
                    version: '<=6.19.0',
                    content: '<p>Hi there,</p><p>Full advisory body...</p>',
                    type: 'alert',
                    top: true,
                    dismissible: false
                }]
            };

            nock('https://updates.ghost.org')
                .get('/')
                .query(true)
                .reply(200, JSON.stringify([notification]), {'Content-Type': 'application/json'});

            const notificationsAPIAddStub = sinon.stub().resolves();
            const emailSendStub = sinon.stub().resolves();
            const usersBrowseStub = adminUsersStub();

            await makeService({notificationsAPIAddStub, emailSendStub, usersBrowseStub}).check();

            // Banner: the short channel content, not the legacy shim
            sinon.assert.calledOnce(notificationsAPIAddStub);
            const banner = notificationsAPIAddStub.args[0][0].notifications[0];
            assert.equal(banner.message, '<strong>Critical Ghost security update available.</strong>');
            assert.equal(banner.dismissible, false);
            assert.equal(banner.top, true);

            // Email: the rich channel content + channel-supplied subject
            sinon.assert.calledOnce(emailSendStub);
            assert.deepEqual(emailSendStub.args[0][0].to, ['admin@example.com']);
            assert.equal(emailSendStub.args[0][0].subject, 'Critical Ghost security update');
            assert.equal(emailSendStub.args[0][0].content, '<p>Hi there,</p><p>Full advisory body...</p>');
        });

        it('routes a banner-only channels notification to the banner surface and sends no email', async function () {
            const notification = {
                id: 'release-6-42-1',
                version: '6.42.1',
                target: {ghost_versions: '^6'},
                channels: {
                    banner: {
                        content: 'Ghost 6.42.1 is available',
                        dismissible: true,
                        top: false
                    }
                },
                messages: [{
                    id: 'legacy',
                    version: '^6',
                    content: 'Ghost 6.42.1 is available',
                    type: 'info',
                    top: false,
                    dismissible: true
                }]
            };

            nock('https://updates.ghost.org')
                .get('/')
                .query(true)
                .reply(200, JSON.stringify([notification]), {'Content-Type': 'application/json'});

            const notificationsAPIAddStub = sinon.stub().resolves();
            const emailSendStub = sinon.stub().resolves();
            const usersBrowseStub = adminUsersStub();

            await makeService({notificationsAPIAddStub, emailSendStub, usersBrowseStub}).check();

            sinon.assert.calledOnce(notificationsAPIAddStub);
            assert.equal(notificationsAPIAddStub.args[0][0].notifications[0].message, 'Ghost 6.42.1 is available');
            sinon.assert.notCalled(emailSendStub);
        });

        it('routes an email-only channels notification to the email surface and persists no banner', async function () {
            const notification = {
                id: 'email-only',
                version: 'email-only',
                target: {ghost_versions: '*'},
                channels: {
                    email: {
                        subject: 'Email-only notice',
                        content: '<p>Body</p>'
                    }
                },
                messages: []
            };

            nock('https://updates.ghost.org')
                .get('/')
                .query(true)
                .reply(200, JSON.stringify([notification]), {'Content-Type': 'application/json'});

            const notificationsAPIAddStub = sinon.stub().resolves();
            const emailSendStub = sinon.stub().resolves();
            const usersBrowseStub = adminUsersStub();

            await makeService({notificationsAPIAddStub, emailSendStub, usersBrowseStub}).check();

            sinon.assert.calledOnce(emailSendStub);
            assert.equal(emailSendStub.args[0][0].subject, 'Email-only notice');
            assert.equal(emailSendStub.args[0][0].content, '<p>Body</p>');
            sinon.assert.notCalled(notificationsAPIAddStub);
        });

        it('falls back to legacy messages handling when channels is absent', async function () {
            // Same shape and assertions as the existing 'should send an
            // email for critical notification' test; here we re-prove the
            // legacy path explicitly within the channels dispatch suite so
            // the fallback contract is its own pinned outcome.
            const notification = {
                id: 1,
                messages: [{
                    id: crypto.randomUUID(),
                    version: 'custom1',
                    content: '<p>Critical legacy message</p>',
                    dismissible: false,
                    top: true,
                    type: 'alert'
                }]
            };

            nock('https://updates.ghost.org')
                .get('/')
                .query(true)
                .reply(200, JSON.stringify([notification]), {'Content-Type': 'application/json'});

            const notificationsAPIAddStub = sinon.stub().resolves();
            const emailSendStub = sinon.stub().resolves();
            const usersBrowseStub = adminUsersStub();

            await makeService({notificationsAPIAddStub, emailSendStub, usersBrowseStub}).check();

            sinon.assert.calledOnce(notificationsAPIAddStub);
            assert.equal(notificationsAPIAddStub.args[0][0].notifications[0].message, '<p>Critical legacy message</p>');
            sinon.assert.calledOnce(emailSendStub);
            assert.equal(emailSendStub.args[0][0].content, '<p>Critical legacy message</p>');
        });

        it('does not double-deliver when both channels and messages are present', async function () {
            // The wire carries both for backwards-compat. Dispatcher must
            // pick exactly one path per notification, not both, so an
            // install never gets two banners or two emails for one event.
            const notification = {
                id: 'ghsa-YYY',
                version: 'ghsa-YYY',
                target: {ghost_versions: '*'},
                channels: {
                    banner: {content: 'banner from channels', dismissible: false, top: true},
                    email: {subject: 'subj', content: 'email from channels'}
                },
                messages: [{
                    id: 'legacy',
                    version: '*',
                    content: 'content from messages',
                    type: 'alert',
                    top: true,
                    dismissible: false
                }]
            };

            nock('https://updates.ghost.org')
                .get('/')
                .query(true)
                .reply(200, JSON.stringify([notification]), {'Content-Type': 'application/json'});

            const notificationsAPIAddStub = sinon.stub().resolves();
            const emailSendStub = sinon.stub().resolves();
            const usersBrowseStub = adminUsersStub();

            await makeService({notificationsAPIAddStub, emailSendStub, usersBrowseStub}).check();

            // Exactly one banner add, with channels content (not messages content)
            sinon.assert.calledOnce(notificationsAPIAddStub);
            assert.equal(notificationsAPIAddStub.args[0][0].notifications[0].message, 'banner from channels');

            // Exactly one email send, with channels content + subject
            sinon.assert.calledOnce(emailSendStub);
            assert.equal(emailSendStub.args[0][0].content, 'email from channels');
            assert.equal(emailSendStub.args[0][0].subject, 'subj');
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
            assert.equal(logging.error.args[0][0].context, 'Checking for updates failed, your site will continue to function.');
            assert.equal(logging.error.args[0][0].help, 'If you get this error repeatedly, please seek help from https://ghost.org/docs/');
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
                assert.equal(logging.error.args[0][0].context, 'Checking for updates failed, your site will continue to function.');
                assert.equal(logging.error.args[0][0].help, 'If you get this error repeatedly, please seek help from https://ghost.org/docs/');

                assert.equal(e.context, 'Checking for updates failed, your site will continue to function.');
            }
        });
    });
});
