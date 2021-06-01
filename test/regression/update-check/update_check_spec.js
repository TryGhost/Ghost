const should = require('should');
const sinon = require('sinon');
const moment = require('moment');
const uuid = require('uuid');
const configUtils = require('../../utils/configUtils');
const urlUtils = require('../../utils/urlUtils');
const packageInfo = require('../../../package.json');
const ghostVersion = require('../../../core/server/lib/ghost-version');

const UpdateCheckService = require('../../../core/server/update-check-service');

describe('Update Check', function () {
    const internal = {context: {internal: true}};
    let settingsStub;
    let i18nStub;
    let loggingStub;
    let requestStub;
    let urlUtilsStub;

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

        i18nStub = {
            t: sinon.stub()
        };

        loggingStub = {
            error: sinon.stub()
        };

        requestStub = sinon.stub();
        urlUtilsStub = urlUtils.stubUrlUtilsFromConfig();
    });

    afterEach(function () {
        sinon.restore();
        urlUtils.restore();
        configUtils.restore();
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
                config: configUtils.config,
                i18n: i18nStub,
                logging: loggingStub,
                urlUtils: urlUtilsStub,
                request: requestStub,
                ghostVersion,
                ghostMailer: {
                    send: sinon.stub().resolves()
                }
            });

            await updateCheckService.check();

            requestStub.calledOnce.should.equal(true);

            requestStub.args[0][0].should.equal('https://updates.ghost.org');
            requestStub.args[0][1].query.ghost_version.should.equal(ghostVersion.full);
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
                config: configUtils.config
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
                config: configUtils.config,
                i18n: i18nStub,
                logging: loggingStub,
                urlUtils: urlUtilsStub,
                request: requestStub,
                ghostVersion,
                ghostMailer: {
                    send: sinon.stub().resolves()
                }
            });

            await updateCheckService.check();

            requestStub.calledOnce.should.equal(true);

            requestStub.args[0][0].should.equal('https://updates.ghost.org');
            requestStub.args[0][1].query.ghost_version.should.equal(ghostVersion.full);
        });
    });

    describe('Data sent with the POST request', function () {
        before(function () {
            configUtils.set('privacy:useUpdateCheck', true);
        });

        after(function () {
            configUtils.restore();
        });

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
                config: configUtils.config,
                i18n: i18nStub,
                logging: loggingStub,
                urlUtils: urlUtilsStub,
                request: requestStub,
                ghostVersion,
                ghostMailer: {
                    send: sinon.stub().resolves()
                }
            });

            await updateCheckService.check();

            requestStub.calledOnce.should.equal(true);

            requestStub.args[0][0].should.equal('https://updates.ghost.org');

            const data = requestStub.args[0][1].body;
            data.ghost_version.should.equal(packageInfo.version);
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
                config: configUtils.config,
                i18n: i18nStub,
                logging: loggingStub,
                urlUtils: urlUtilsStub,
                request: sinon.stub().resolves({
                    body: {
                        notifications: [notification]
                    }
                }),
                ghostVersion,
                ghostMailer: {
                    send: sinon.stub().resolves()
                }
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
            const mailServiceStub = {
                send: sinon.stub().resolves()
            };

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
                config: configUtils.config,
                i18n: i18nStub,
                logging: loggingStub,
                urlUtils: urlUtilsStub,
                request: sinon.stub().resolves({
                    body: [notification]
                }),
                ghostVersion,
                ghostMailer: mailServiceStub
            });

            await updateCheckService.check();

            mailServiceStub.send.called.should.be.true();
            mailServiceStub.send.args[0][0].to.should.equal('jbloggs@example.com');
            mailServiceStub.send.args[0][0].subject.should.equal('Action required: Critical alert from Ghost instance http://127.0.0.1:2369');
            mailServiceStub.send.args[0][0].html.should.equal('<p>Critical message. Upgrade your site!</p>');
            mailServiceStub.send.args[0][0].forceTextContent.should.equal(true);

            notificationsAPIAddStub.calledOnce.should.equal(true);
            notificationsAPIAddStub.args[0][0].notifications.length.should.equal(1);
        });
    });
});
