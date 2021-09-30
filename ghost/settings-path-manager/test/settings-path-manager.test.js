// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const should = require('should');
const SettingsPathManager = require('../');

describe('Settings Path Manager', function () {
    it('throws when paths parameter is not provided', function () {
        try {
            const settingsPathManager = new SettingsPathManager({
                paths: [],
                type: 'routes'
            });

            should.fail(settingsPathManager, 'Should have errored');
        } catch (err) {
            should.exist(err);
            err.message.should.match(/paths values/g);
        }
    });

    describe('getDefaultFilePath', function () {
        it('returns default file path based on routes configuration', function (){
            const settingsPathManager = new SettingsPathManager({
                paths: ['/content/settings', '/content/data'],
                type: 'routes'
            });

            const path = settingsPathManager.getDefaultFilePath();

            path.should.equal('/content/settings/routes.yaml');
        });

        it('returns default file path based on redirects configuration', function (){
            const settingsPathManager = new SettingsPathManager({
                paths: ['/content/data', '/content/settings'],
                type: 'redirects'
            });

            const path = settingsPathManager.getDefaultFilePath();

            path.should.equal('/content/data/redirects.yaml');
        });

        it('returns default file path based on redirects configuration with json extension', function (){
            const settingsPathManager = new SettingsPathManager({
                paths: ['/content/data', '/content/settings'],
                type: 'redirects',
                extensions: ['json', 'yaml']
            });

            const path = settingsPathManager.getDefaultFilePath();

            path.should.equal('/content/data/redirects.json');
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

            path.should.match(/\/content\/data\/routes-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}.yaml/);
        });
    });
});
