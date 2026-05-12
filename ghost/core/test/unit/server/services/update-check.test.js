const sinon = require('sinon');
const nock = require('nock');
const moment = require('moment');
const crypto = require('crypto');
const assert = require('node:assert/strict');
const util = require('util');
const childProcess = require('child_process');
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

        // Conditional util.promisify stub — only intercepts `child_process.exec`
        // calls (which update-check uses to capture the npm version). Other
        // callers — notably @tryghost/request's internal cacheable-lookup
        // DNS resolution — keep working through the real promisify.
        const realPromisify = util.promisify;
        sinon.stub(util, 'promisify').callsFake((fn) => {
            if (fn === childProcess.exec) {
                return async () => ({stdout: '10.8.2'});
            }
            return realPromisify(fn);
        });

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

            sinon.assert.calledTwice(usersBrowseStub);

            // Second (non statistical) call should be looking for admin users with an 'active' status only
            assert.deepEqual(usersBrowseStub.args[1][0], {
                limit: 'all',
                include: ['roles'],
                filter: 'status:active',
                context: {
                    internal: true
                }
            });
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
            const sendEmailStub = sinon.stub().resolves();
            const path = require('path');
            const EmailContentGenerator = require('../../../../core/server/services/lib/email-content-generator');
            const generator = new EmailContentGenerator({
                getSiteUrl: () => 'http://127.0.0.1:2369',
                getSiteTitle: () => 'Test Site',
                templatesDir: path.resolve(__dirname, '..', '..', '..', '..', 'core', 'server', 'services', 'mail', 'templates')
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
                                email: 'jbloggs@example.com',
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
                    siteUrl: 'http://127.0.0.1:2369',
                    isPrivacyDisabled: true,
                    ghostVersion: '0.8.0'
                },
                request: request,
                sendEmail: sendEmailStub,
                generateEmailContent: generator.getContent.bind(generator)
            });

            await updateCheckService.check();

            sinon.assert.called(sendEmailStub);
            assert.equal(sendEmailStub.args[0][0].to, 'jbloggs@example.com');
            assert.equal(sendEmailStub.args[0][0].subject, 'Critical Ghost security update');
            assert.match(sendEmailStub.args[0][0].html, /Critical Ghost security update/);
            assert.match(sendEmailStub.args[0][0].html, /http:\/\/127\.0\.0\.1:2369/);
            assert.match(sendEmailStub.args[0][0].html, /security\/advisories/);
            assert.equal(sendEmailStub.args[0][0].forceTextContent, undefined);

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

    describe('sendCriticalAlertEmail', function () {
        function buildService({sendEmail, generateEmailContent, config} = {}) {
            return new UpdateCheckService({
                api: {
                    settings: {read: settingsStub, edit: settingsStub},
                    users: {browse: sinon.stub().resolves()},
                    posts: {browse: sinon.stub().resolves()},
                    notifications: {add: sinon.stub().resolves()}
                },
                config: Object.assign({
                    ghostVersion: '5.99.0',
                    siteUrl: 'http://127.0.0.1:2369'
                }, config || {}),
                request: requestStub,
                sendEmail: sendEmail || sinon.stub().resolves(),
                generateEmailContent: generateEmailContent
            });
        }

        it('renders the critical-update template with siteUrl and recipientEmail', async function () {
            const generateEmailContent = sinon.stub().resolves({
                html: '<html>rendered</html>',
                text: 'plain text'
            });
            const sendEmail = sinon.stub().resolves();

            const svc = buildService({sendEmail, generateEmailContent});

            await svc.sendCriticalAlertEmail({
                to: 'owner@example.com',
                siteUrl: 'http://127.0.0.1:2369'
            });

            sinon.assert.calledOnce(generateEmailContent);
            const renderArgs = generateEmailContent.args[0][0];
            assert.equal(renderArgs.template, 'critical-update');
            assert.equal(renderArgs.data.siteUrl, 'http://127.0.0.1:2369');
            assert.equal(renderArgs.data.recipientEmail, 'owner@example.com');
        });

        it('sends the rendered HTML and text via sendEmail', async function () {
            const generateEmailContent = sinon.stub().resolves({
                html: '<html>rendered</html>',
                text: 'plain text'
            });
            const sendEmail = sinon.stub().resolves();

            const svc = buildService({sendEmail, generateEmailContent});

            await svc.sendCriticalAlertEmail({
                to: 'owner@example.com',
                siteUrl: 'http://127.0.0.1:2369'
            });

            sinon.assert.calledOnce(sendEmail);
            const sentMessage = sendEmail.args[0][0];
            assert.equal(sentMessage.to, 'owner@example.com');
            assert.equal(sentMessage.subject, 'Critical Ghost security update');
            assert.equal(sentMessage.html, '<html>rendered</html>');
            assert.equal(sentMessage.text, 'plain text');
            // Critically: we no longer set forceTextContent so the HTML body
            // reaches the mailbox instead of being stripped.
            assert.equal(sentMessage.forceTextContent, undefined);
        });
    });

    describe('normalizeMessage', function () {
        const {normalizeMessage} = UpdateCheckService;

        it('applies defaults to a sparse message', function () {
            const message = normalizeMessage({id: 'm-1', content: 'hello'});

            assert.equal(message.id, 'm-1');
            assert.equal(message.message, 'hello');
            assert.equal(message.status, 'alert');
            assert.equal(message.type, 'info');
            assert.equal(message.top, false);
            assert.equal(message.dismissible, true);
            assert.equal(message.custom, false);
            assert.equal(message.createdAt, undefined);
        });

        it('preserves provided values', function () {
            const message = normalizeMessage({
                id: 'm-2',
                content: 'x',
                status: 'notification',
                type: 'alert',
                top: true,
                dismissible: false
            });

            assert.equal(message.status, 'notification');
            assert.equal(message.type, 'alert');
            assert.equal(message.top, true);
            assert.equal(message.dismissible, false);
        });

        it('honors an explicit dismissible:false', function () {
            const message = normalizeMessage({id: 'm-4', dismissible: false});

            assert.equal(message.dismissible, false);
        });

        it('absorbs notification-level fields (custom, createdAt)', function () {
            const message = normalizeMessage(
                {id: 'm-5', content: 'x'},
                {custom: 1, created_at: '2026-05-12T08:30:00.000Z'}
            );

            assert.equal(message.custom, true);
            assert.ok(message.createdAt instanceof Date);
            assert.equal(message.createdAt.toISOString(), '2026-05-12T08:30:00.000Z');
        });
    });

    describe('isCriticalAlert', function () {
        const {isCriticalAlert, normalizeMessage} = UpdateCheckService;

        it('is true when the upstream type is alert', function () {
            assert.equal(isCriticalAlert(normalizeMessage({id: 'm', type: 'alert'})), true);
        });

        it('is false for any other type', function () {
            assert.equal(isCriticalAlert(normalizeMessage({id: 'm', type: 'info'})), false);
            assert.equal(isCriticalAlert(normalizeMessage({id: 'm', type: 'warn'})), false);
            assert.equal(isCriticalAlert(normalizeMessage({id: 'm'})), false);
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
