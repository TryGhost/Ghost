const should = require('should');
const sinon = require('sinon');
const themeConfig = require('../../../../../core/frontend/services/theme-engine/config');

const defaultConfig = themeConfig.getDefaults();

describe('Themes', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('Config', function () {
        it('handles no package.json', function () {
            const config = themeConfig.create();

            config.should.eql(defaultConfig);
        });

        it('handles package.json without config', function () {
            const config = themeConfig.create({name: 'casper'});

            config.should.eql(defaultConfig);
        });

        it('handles allows package.json to override default', function () {
            const overrideConfig = {posts_per_page: 3, card_assets: true};
            const config = themeConfig.create({name: 'casper', config: overrideConfig});

            config.should.eql({...defaultConfig, ...overrideConfig});
        });

        it('handles ignores non-allowed config', function () {
            const config = themeConfig.create({name: 'casper', config: {magic: 'roundabout'}});

            config.should.eql(defaultConfig);
        });
    });
});
