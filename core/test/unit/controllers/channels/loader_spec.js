var should = require('should'),  // jshint ignore:line
    _ = require('lodash'),
    rewire = require('rewire'),
    channelUtils = require('../../../utils/channelUtils'),
    channelLoader = rewire('../../../../server/controllers/channels/loader'),
    Channel = require('../../../../server/controllers/channels/Channel');


should.Assertion.add('Channel', function (options) {
    options = options || {};

    this.params = {operator: 'to be a valid Channel'};
    this.obj.should.be.an.Object();
    this.obj.should.be.an.instanceof(Channel);

    this.obj.should.have.properties('name', 'route', 'context', 'postOptions', 'paged', 'rss', '_origOptions');

    this.obj.name.should.be.a.String();
    this.obj.route.should.be.a.String();
    this.obj.context.should.be.an.Array();
    this.obj.context.length.should.be.aboveOrEqual(1);
    this.obj.postOptions.should.be.an.Object();
    this.obj.paged.should.be.a.Boolean();
    this.obj.rss.should.be.a.Boolean();
});

describe('Channel Config', function () {
    var channelReset;

    before(function () {
        channelReset = channelLoader.__set__('loadConfig', function () {
            return channelUtils.getDefaultChannels();
        });
    });

    after(function () {
        channelReset();
    });

    it('should build a list of channels', function () {
        var channels = channelLoader.list();
        channels.should.be.an.Array().with.lengthOf(3);

        _.map(channels, 'name').should.eql(['index', 'tag', 'author']);

        _.each(channels, function (channel) {
            channel.should.be.a.Channel();
        });
    });
});
