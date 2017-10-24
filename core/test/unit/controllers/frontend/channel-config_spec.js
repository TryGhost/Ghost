var should = require('should'),  // jshint ignore:line
    _ = require('lodash'),
    rewire = require('rewire'),
    channelUtils = require('../../../utils/channelUtils'),
    channelConfig = rewire('../../../../server/controllers/frontend/channel-config');

describe('Channel Config', function () {
    var channelReset;

    before(function () {
        channelReset = channelConfig.__set__('loadConfig', function () {
            return channelUtils.getDefaultChannels();
        });
    });

    after(function () {
        channelReset();
    });

    it('should build a list of channels', function () {
        var channels = channelConfig.list();
        channels.should.be.an.Object();

        _.map(channels, 'name').should.eql(['index', 'tag', 'author']);
    });
});
