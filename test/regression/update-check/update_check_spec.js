const _ = require('lodash');
const Promise = require('bluebird');
const should = require('should');
const rewire = require('rewire');
const sinon = require('sinon');
const moment = require('moment');
const uuid = require('uuid');
const testUtils = require('../../utils');
const configUtils = require('../../utils/configUtils');
const urlUtils = require('../../utils/urlUtils');
const packageInfo = require('../../../package.json');
const api = require('../../../core/server/api').v2;
const mailService = require('../../../core/server/services/mail/');
let ghostVersion = rewire('../../../core/server/lib/ghost-version');

const UpdateCheckService = rewire('../../../core/server/update-check-service');

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

    describe('fn: updateCheck', function () {
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
                ghostMailer: mailService
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
                ghostMailer: mailService
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
                ghostMailer: mailService
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
});
