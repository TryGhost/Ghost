var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),

    themeConfig = require('../../../server/themes/config'),

    sandbox = sinon.sandbox.create();

describe('Themes', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('Config', function () {
        it('handles no package.json', function () {
            var config = themeConfig.create();

            config.should.eql({posts_per_page: 5});
        });

        it('handles package.json without config', function () {
            var config = themeConfig.create({name: 'casper'});

            config.should.eql({posts_per_page: 5});
        });

        it('handles allows package.json to overrideg default', function () {
            var config = themeConfig.create({name: 'casper', config: {posts_per_page: 3}});

            config.should.eql({posts_per_page: 3});
        });

        it('handles ignores non-allowed config', function () {
            var config = themeConfig.create({name: 'casper', config: {magic: 'roundabout'}});

            config.should.eql({posts_per_page: 5});
        });
    });
});
