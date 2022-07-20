const should = require('should');
const sinon = require('sinon');
const themeConfig = require('../../../../../core/frontend/services/theme-engine/config');

describe('Themes', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('Config', function () {
        it('handles no package.json', function () {
            const config = themeConfig.create();

            config.should.eql({
                posts_per_page: 5,
                card_assets: true
            });
        });

        it('handles package.json without config', function () {
            const config = themeConfig.create({name: 'casper'});

            config.should.eql({
                posts_per_page: 5,
                card_assets: true
            });
        });

        it('handles allows package.json to override default', function () {
            const config = themeConfig.create({name: 'casper', config: {posts_per_page: 3, card_assets: true}});

            config.should.eql({
                posts_per_page: 3,
                card_assets: true
            });
        });

        it('handles ignores non-allowed config', function () {
            const config = themeConfig.create({name: 'casper', config: {magic: 'roundabout'}});

            config.should.eql({
                posts_per_page: 5,
                card_assets: true
            });
        });
    });
});
