var should = require('should'),  // jshint ignore:line
    _ = require('lodash'),
    rewire = require('rewire'),
    channelUtils = require('../../../utils/channelUtils'),
    channelLoader = rewire('../../../../server/services/channels/loader');

describe('Channels', function () {
    describe('Loader', function () {
        // This is a bit of a weird test. because the loader functionality is TEMPORARY
        // If you have a local config, that gets loaded instead of the default.
        // This just tests that either way, we get a JSON object.
        it('should load a JSON object', function () {
            var loadConfig = channelLoader.__get__('loadConfig'),
                result = loadConfig();

            result.should.be.an.Object();
        });
    });

    describe('Default config', function () {
        var channelReset;

        before(function () {
            // Change the channels we get returned
            channelReset = channelLoader.__set__('loadConfig', function () {
                return channelUtils.getDefaultChannels();
            });
        });

        after(function () {
            channelReset();
        });

        it('[default] list() should return a list of channel objects', function () {
            var channels = channelLoader.list();
            channels.should.be.an.Array().with.lengthOf(3);

            _.map(channels, 'name').should.eql(['index', 'tag', 'author']);

            _.each(channels, function (channel) {
                channel.should.be.a.Channel();
            });
        });
    });
});
