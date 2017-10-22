/*jshint expr:true*/
var should = require('should'),
    channelConfig = require('../../../../server/controllers/frontend/channel-config');

describe('Channel Config', function () {
    // This is actually a bullshit test
    // because you could have a local config.channels.json and it would fail
    // @TODO fix this test by refactoring code
    it('should build a list of channels', function () {
        var channels = channelConfig.list();
        channels.should.be.an.Object().with.properties(['index', 'tag', 'author']);
    });
});
