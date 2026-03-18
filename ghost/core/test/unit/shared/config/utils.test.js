const assert = require('node:assert/strict');
const sinon = require('sinon');
const _ = require('lodash');
const configUtils = require('../../../../core/shared/config/utils');

let fakeConfig = {};
let fakeNconf = {};
let changedKey = [];

describe('Config Utils', function () {
    describe('sanitizeAdminUrl', function () {
        let logging;

        beforeEach(function () {
            logging = require('@tryghost/logging');
            sinon.stub(logging, 'warn');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('strips /ghost from admin:url and warns', function () {
            const config = {};
            const nconf = {
                get: key => config[key],
                set: function (key, value) {
                    config[key] = value;
                }
            };
            config['admin:url'] = 'http://admin.localhost:2368/ghost';

            configUtils.sanitizeAdminUrl(nconf);

            assert.equal(config['admin:url'], 'http://admin.localhost:2368');
            sinon.assert.calledOnce(logging.warn);
            assert.match(logging.warn.firstCall.args[0], /admin:url should not contain \/ghost/);
        });

        it('strips /ghost/ with trailing slash', function () {
            const config = {};
            const nconf = {
                get: key => config[key],
                set: function (key, value) {
                    config[key] = value;
                }
            };
            config['admin:url'] = 'https://admin.example.com/ghost/';

            configUtils.sanitizeAdminUrl(nconf);

            assert.equal(config['admin:url'], 'https://admin.example.com');
        });

        it('does not modify admin:url without /ghost', function () {
            const config = {};
            const nconf = {
                get: key => config[key],
                set: function (key, value) {
                    config[key] = value;
                }
            };
            config['admin:url'] = 'https://admin.example.com';

            configUtils.sanitizeAdminUrl(nconf);

            assert.equal(config['admin:url'], 'https://admin.example.com');
            sinon.assert.notCalled(logging.warn);
        });

        it('does nothing when admin:url is not set', function () {
            const nconf = {
                get: function () {
                    return undefined;
                },
                set: function () {
                    throw new Error('should not be called');
                }
            };

            configUtils.sanitizeAdminUrl(nconf);
            // no error thrown
        });
    });

    describe('makePathsAbsolute', function () {
        beforeEach(function () {
            changedKey = [];

            fakeNconf.get = (key) => {
                key = key.replace(':', '');
                return _.get(fakeConfig, key);
            };
            fakeNconf.set = function (key, value) {
                changedKey.push([key, value]);
            };
        });

        it('ensure we change paths only', function () {
            fakeConfig.database = {
                client: 'mysql',
                connection: {
                    filename: 'content/data/ghost.db'
                }
            };

            configUtils.makePathsAbsolute(fakeNconf, fakeConfig.database, 'database');

            assert.equal(changedKey.length, 1);
            assert.equal(changedKey[0][0], 'database:connection:filename');
            assert.notEqual(changedKey[0][1], 'content/data/ghost.db');
        });

        it('ensure it skips non strings', function () {
            fakeConfig.database = {
                test: 10
            };

            configUtils.makePathsAbsolute(fakeNconf, fakeConfig.database, 'database');
            assert.equal(changedKey.length, 0);
        });

        it('ensure we don\'t change absolute paths', function () {
            fakeConfig.database = {
                client: 'mysql',
                connection: {
                    filename: '/content/data/ghost.db'
                }
            };

            configUtils.makePathsAbsolute(fakeNconf, fakeConfig.database, 'database');
            assert.equal(changedKey.length, 0);
        });

        it('match paths on windows', function () {
            fakeConfig.database = {
                filename: 'content\\data\\ghost.db'

            };

            configUtils.makePathsAbsolute(fakeNconf, fakeConfig.database, 'database');
            assert.equal(changedKey.length, 1);
            assert.equal(changedKey[0][0], 'database:filename');
            assert.notEqual(changedKey[0][1], 'content\\data\\ghost.db');
        });
    });
});
