const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../utils');
const _ = require('lodash');

// Stuff we are testing
const exporter = require('../../../core/server/data/exporter');

const ghostVersion = require('../../../core/server/lib/ghost-version');

describe('Exporter', function () {
    before(testUtils.teardownDb);
    afterEach(testUtils.teardownDb);
    afterEach(function () {
        sinon.restore();
    });
    beforeEach(testUtils.setup('default', 'settings'));

    should.exist(exporter);

    it('exports data', function (done) {
        exporter.doExport().then(function (exportData) {
            const tables = ['posts', 'users', 'roles', 'roles_users', 'permissions', 'permissions_roles',
                'permissions_users', 'settings', 'tags', 'posts_tags'];

            should.exist(exportData);

            should.exist(exportData.meta);
            should.exist(exportData.data);

            exportData.meta.version.should.equal(ghostVersion.full);

            _.each(tables, function (name) {
                should.exist(exportData.data[name]);
            });

            should.not.exist(_.find(exportData.data.settings, {key: 'permalinks'}));

            // should not export sqlite data
            should.not.exist(exportData.data.sqlite_sequence);
            done();
        }).catch(done);
    });
});
