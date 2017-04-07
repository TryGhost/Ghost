var should = require('should'), // jshint ignore:line
    getAssetUrl = require('../../../server/data/meta/asset_url'),
    config = require('../../../server/config');

describe('getAssetUrl', function () {
    it('should return asset url with just context', function () {
        var testUrl = getAssetUrl('myfile.js');
        testUrl.should.equal('/assets/myfile.js?v=' + config.get('assetHash'));
    });

    it('should return asset url with just context even with leading /', function () {
        var testUrl = getAssetUrl('/myfile.js');
        testUrl.should.equal('/assets/myfile.js?v=' + config.get('assetHash'));
    });

    it('should not add asset to url if favicon.ico', function () {
        var testUrl = getAssetUrl('favicon.ico');
        testUrl.should.equal('/favicon.ico');
    });

    it('should not add asset to url if ghost.css for default templates', function () {
        var testUrl = getAssetUrl('public/ghost.css');
        testUrl.should.equal('/public/ghost.css?v=' + config.get('assetHash'));
    });

    it('should not add asset to url has public in it', function () {
        var testUrl = getAssetUrl('public/myfile.js');
        testUrl.should.equal('/public/myfile.js?v=' + config.get('assetHash'));
    });

    it('should return asset minified url when minify true', function () {
        var testUrl = getAssetUrl('myfile.js', true);
        testUrl.should.equal('/assets/myfile.min.js?v=' + config.get('assetHash'));
    });

    it('should not add min to anything besides the last .', function () {
        var testUrl = getAssetUrl('test.page/myfile.js', true);
        testUrl.should.equal('/assets/test.page/myfile.min.js?v=' + config.get('assetHash'));
    });
});
