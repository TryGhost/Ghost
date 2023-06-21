require('./utils');

const sinon = require('sinon');
const moment = require('moment');
const uuid = require('uuid');
const assert = require('assert/strict');

const logging = require('@tryghost/logging');
const UpdateCheckService = require('../lib/UpdateCheckService');

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

        sinon.stub(logging, 'error');

        requestStub = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('UpdateCheck execution', function () {
        it('update check was executed', async function () {
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
                request: requestStub
            });

            await updateCheckService.check();

            requestStub.calledOnce.should.equal(true);

            requestStub.args[0][0].should.equal('https://updates.ghost.org');
            requestStub.args[0][1].query.ghost_version.should.equal('0.8.0');
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

            requestStub.called.should.equal(false);
        });

        it('update check will happen if it\'s time to check', async function () {
            const updateCheckDelayPassed = sinon.stub().resolves({
                settings: [{
                    value: moment().subtract('10', 'minutes').unix()
                }]
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
                request: requestStub
            });

            await updateCheckService.check();

            requestStub.calledOnce.should.equal(true);

            requestStub.args[0][0].should.equal('https://updates.ghost.org');
            requestStub.args[0][1].query.ghost_version.should.equal('5.3.4');
        });
    });

    describe('Data sent with the POST request', function () {
        it('should report the correct data', async function () {
            const updateCheckService = new UpdateCheckService({
                api: {
                    settings: {
                        read: settingsStub,
                        edit: settingsStub
                    },
                    users: {
                        browse: sinon.stub().resolves({
                            users: [{
                                created_at: '1995-12-24T23:15:00Z'
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
                request: requestStub,
                ghostMailer: {
                    send: sinon.stub().resolves()
                }
            });

            await updateCheckService.check();

            requestStub.calledOnce.should.equal(true);

            requestStub.args[0][0].should.equal('https://updates.ghost.org');

            const data = requestStub.args[0][1].body;
            data.ghost_version.should.equal('4.0.0');
            data.node_version.should.equal(process.versions.node);
            data.env.should.equal(process.env.NODE_ENV);
            data.database_type.should.match(/sqlite3|mysql/);
            data.blog_id.should.be.a.String();
            data.blog_id.should.not.be.empty();
            data.theme.should.be.equal('casperito');
            data.blog_created_at.should.equal(819846900);
            data.user_count.should.be.equal(2);
            data.post_count.should.be.equal(13);
            data.npm_version.should.be.a.String();
            data.npm_version.should.not.be.empty();
        });
    });

    describe('Notifications', function () {
        it('should create a release notification for target version', async function () {
            const notification = {
                id: 1,
                custom: 0,
                messages: [{
                    id: uuid.v4(),
                    version: '999.9.x',
                    content: '<p>Hey there! This is for 999.9.0 version</p>',
                    dismissible: true,
                    top: true
                }]
            };

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
                    siteUrl: 'https://localhost:2368/test'
                },
                request: sinon.stub().resolves({
                    body: {
                        notifications: [notification]
                    }
                })
            });

            await updateCheckService.check();

            notificationsAPIAddStub.calledOnce.should.equal(true);
            notificationsAPIAddStub.args[0][0].notifications.length.should.equal(1);

            const targetNotification = notificationsAPIAddStub.args[0][0].notifications[0];
            targetNotification.dismissible.should.eql(notification.messages[0].dismissible);
            targetNotification.id.should.eql(notification.messages[0].id);
            targetNotification.top.should.eql(notification.messages[0].top);
            targetNotification.type.should.eql('info');
            targetNotification.message.should.eql(notification.messages[0].content);

            usersBrowseStub.calledTwice.should.eql(true);

            // Second (non statistical) call should be looking for admin users with an 'active' status only
            usersBrowseStub.args[1][0].should.eql({
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
                    id: uuid.v4(),
                    version: 'custom1',
                    content: '<p>Critical message. Upgrade your site!</p>',
                    dismissible: false,
                    top: true,
                    type: 'alert'
                }]
            };

            const notificationsAPIAddStub = sinon.stub().resolves();
            const sendEmailStub = sinon.stub().resolves();

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
                    siteUrl: 'http://127.0.0.1:2369'
                },
                request: sinon.stub().resolves({
                    body: [notification]
                }),
                sendEmail: sendEmailStub
            });

            await updateCheckService.check();

            sendEmailStub.called.should.be.true();
            sendEmailStub.args[0][0].to.should.equal('jbloggs@example.com');
            sendEmailStub.args[0][0].subject.should.equal('Action required: Critical alert from Ghost instance http://127.0.0.1:2369');
            sendEmailStub.args[0][0].html.should.equal('<p>Critical message. Upgrade your site!</p>');
            sendEmailStub.args[0][0].forceTextContent.should.equal(true);

            notificationsAPIAddStub.calledOnce.should.equal(true);
            notificationsAPIAddStub.args[0][0].notifications.length.should.equal(1);
        });

        it('not create a notification if the check response has no messages', async function () {
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
                    siteUrl: 'https://localhost:2368/test'
                },
                request: sinon.stub().resolves({
                    body: {
                        notifications: []
                    }
                })
            });

            await updateCheckService.check();

            notificationsAPIAddStub.calledOnce.should.equal(false);
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

            settingsStub.called.should.be.true();
            logging.error.called.should.be.true();
            logging.error.args[0][0].context.should.equal('Checking for updates failed, your site will continue to function.');
            logging.error.args[0][0].help.should.equal('If you get this error repeatedly, please seek help from https://ghost.org/docs/');
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
                settingsStub.called.should.be.true();
                logging.error.called.should.be.true();
                logging.error.args[0][0].context.should.equal('Checking for updates failed, your site will continue to function.');
                logging.error.args[0][0].help.should.equal('If you get this error repeatedly, please seek help from https://ghost.org/docs/');

                e.context.should.equal('Checking for updates failed, your site will continue to function.');
            }
        });
    });
});
