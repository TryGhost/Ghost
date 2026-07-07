const assert = require('node:assert/strict');
const {countModuleSingletons, countChokePointRequires} = require('../../../scripts/di-burndown');

describe('di-burndown', function () {
    describe('countModuleSingletons', function () {
        it('counts module.exports = new expressions', function () {
            const files = [
                {path: 'core/a.js', content: 'module.exports = new Thing();\n'},
                {path: 'core/b.js', content: 'module.exports = {new: 1};\nmodule.exports = new Other({});\n'},
                {path: 'core/c.js', content: 'module.exports = factory;\n'},
                {path: 'core/d.js', content: 'module.exports = new Proxy({}, {});\n'}
            ];

            assert.equal(countModuleSingletons(files), 2);
        });
    });

    describe('countChokePointRequires', function () {
        it('counts requires that resolve to a choke point', function () {
            const files = [{
                path: 'core/server/services/example/service.js',
                content: [
                    'const config = require(\'../../../shared/config\');',
                    'const db = require(\'../../data/db\');',
                    'const models = require(\'../../models\');',
                    'const other = require(\'./local-helper\');'
                ].join('\n')
            }];

            assert.equal(countChokePointRequires(files), 3);
        });

        it('counts domain-events requires', function () {
            const files = [{
                path: 'core/server/services/example/service.js',
                content: 'const DomainEvents = require(\'../../lib/common/domain-events\');'
            }];

            assert.equal(countChokePointRequires(files), 1);
        });

        it('counts es module imports', function () {
            const files = [{
                path: 'core/server/services/example/service.ts',
                content: 'import events from \'../../lib/common/events\';'
            }];

            assert.equal(countChokePointRequires(files), 1);
        });

        it('counts index requires of a choke point', function () {
            const files = [{
                path: 'core/server/services/example/service.js',
                content: 'const db = require(\'../../data/db/index\');'
            }];

            assert.equal(countChokePointRequires(files), 1);
        });

        it('does not count requires from the container or the choke points themselves', function () {
            const files = [
                {
                    path: 'core/shared/container/registrations.ts',
                    content: 'const config = require(\'../config\');'
                },
                {
                    path: 'core/shared/settings-cache/index.js',
                    content: 'const events = require(\'../../server/lib/common/events\');'
                },
                {
                    path: 'core/server/lib/common/events.js',
                    content: 'const config = require(\'../../../shared/config\');'
                }
            ];

            assert.equal(countChokePointRequires(files), 0);
        });

        it('does not count submodules or similarly named paths', function () {
            const files = [{
                path: 'core/server/services/example/service.js',
                content: [
                    'const dbBackup = require(\'../../data/db/backup\');',
                    'const modelsUtil = require(\'../../models-util\');'
                ].join('\n')
            }];

            assert.equal(countChokePointRequires(files), 0);
        });
    });
});
