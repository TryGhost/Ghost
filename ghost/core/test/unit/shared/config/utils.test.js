const assert = require('node:assert/strict');
const _ = require('lodash');
const configUtils = require('../../../../core/shared/config/utils');

let fakeConfig = {};
let fakeNconf = {};
let changedKey = [];

describe('Config Utils', function () {
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
