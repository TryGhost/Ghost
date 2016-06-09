/*jshint expr:true*/
var should   = require('should'),
    channelConfig = require('../../../../server/controllers/frontend/channel-config').get;

describe('Channel Config', function () {
    it('should get the index config', function () {
        var result = channelConfig('index');
        should.exist(result);
        result.name.should.eql('index');
    });

    it('should get the author config', function () {
        var result = channelConfig('author');
        should.exist(result);
        result.name.should.eql('author');
    });

    it('should get the tag config', function () {
        var result = channelConfig('tag');
        should.exist(result);
        result.name.should.eql('tag');
    });
});
