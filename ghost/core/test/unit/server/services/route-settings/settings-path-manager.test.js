const assert = require('node:assert/strict');
const SettingsPathManager = require('../../../../../core/server/services/route-settings/settings-path-manager');

describe('Settings Path Manager', function () {
    it('throws when paths parameter is not provided', function () {
        assert.throws(() => {
            new SettingsPathManager({
                paths: [],
                type: 'routes'
            });
        }, /paths values/g);
    });

    describe('getDefaultFilePath', function () {
        it('returns default file path based on routes configuration', function (){
            const settingsPathManager = new SettingsPathManager({
                paths: ['/content/settings', '/content/data'],
                type: 'routes'
            });

            const path = settingsPathManager.getDefaultFilePath();

            assert.equal(path, '/content/settings/routes.yaml');
        });

        it('returns default file path based on redirects configuration', function (){
            const settingsPathManager = new SettingsPathManager({
                paths: ['/content/data', '/content/settings'],
                type: 'redirects'
            });

            const path = settingsPathManager.getDefaultFilePath();

            assert.equal(path, '/content/data/redirects.yaml');
        });

        it('returns default file path based on redirects configuration with json extension', function (){
            const settingsPathManager = new SettingsPathManager({
                paths: ['/content/data', '/content/settings'],
                type: 'redirects',
                extensions: ['json', 'yaml']
            });

            const path = settingsPathManager.getDefaultFilePath();

            assert.equal(path, '/content/data/redirects.json');
        });
    });

    describe('getBackupFilePath', function () {
        it('returns a path to store a backup', function (){
            const settingsPathManager = new SettingsPathManager({
                paths: ['/content/data', '/content/settings'],
                type: 'routes',
                extensions: ['yaml']
            });

            const path = settingsPathManager.getBackupFilePath();

            assert.match(path, /\/content\/data\/routes-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}.yaml/);
        });
    });
});
