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
    describe('fn: check', function () {
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
            requestStub.args[0][1].query.ghost_version.should.equal(ghostVersion.full);        });
    });
});
