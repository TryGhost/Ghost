var _ = require('lodash'),
    should = require('should'),
    defaultChannels = require('../../server/services/channels/config.channels.json'),
    Channel = require('../../server/services/channels/Channel');

// This is a function to get a fake or test channel
// It's currently based on the default config in Ghost itself
module.exports.getTestChannel = function getTestChannel(channelName) {
    return new Channel(channelName, defaultChannels[channelName]);
};

module.exports.getDefaultChannels = function getDefaultChannels() {
    return defaultChannels;
};

// Little shortcut
module.exports.Channel = Channel;

// Custom Channel-Related assertions
should.Assertion.add('Channel', function (options) {
    options = options || {};

    this.params = {operator: 'to be a valid Channel'};
    this.obj.should.be.an.Object();
    this.obj.should.be.an.instanceof(Channel);

    this.obj.should.have.properties('name', 'route', 'context', 'postOptions', 'isPaged', 'hasRSS', '_origOptions');

    this.obj.name.should.be.a.String();
    this.obj.route.should.be.a.String();
    this.obj.context.should.be.an.Array();
    this.obj.context.length.should.be.aboveOrEqual(1);
    this.obj.postOptions.should.be.an.Object();
    this.obj.isPaged.should.be.a.Boolean();
    this.obj.hasRSS.should.be.a.Boolean();
});

/**
 * Assertions on the express API
 */
should.Assertion.add('Stack', function (length) {
    this.params = {
        operator: 'to be a valid Express Stack',
        actual: _.map(this.obj, 'name')
    };

    this.obj.should.be.an.Array();
    if (length) {
        this.obj.length.should.eql(length);
    }
});

should.Assertion.add('ExpressRouter', function (options) {
    options = options || {};

    this.params = {
        operator: 'to be a valid Express Router',
        actual: require('util').inspect(this.obj, {depth: 1})
    };

    this.obj.should.be.a.Function();
    this.obj.name.should.eql('router');
    this.obj.should.have.property('mergeParams', true);
    this.obj.should.have.property('strict', undefined);
    this.obj.should.have.property('stack');

    if (options.params) {
        // Verify the params function!
        this.obj.params.should.have.property(options.params.key);
        this.obj.params[options.params.key][0].name.should.eql(options.params.value);
    }

    this.obj.stack.should.be.a.Stack(options.stackLength);
});

should.Assertion.add('Layer', function () {
    this.params = {operator: 'to be a valid Express Layer'};

    this.obj.should.be.an.Object().with.properties(['handle', 'name', 'params', 'path', 'keys', 'regexp', 'route']);
});

should.Assertion.add('RouterLayer', function (options) {
    options = options || {};

    this.params = {operator: 'to be a valid Express Layer, with Router as handle'};

    this.obj.should.be.a.Layer();
    this.obj.name.should.eql('router');
    this.obj.handle.should.be.an.ExpressRouter(options);

    if (options.regexp) {
        this.obj.regexp.toString().should.match(options.regexp);
    }
});

should.Assertion.add('DispatchLayer', function (options) {
    options = options || {};

    this.params = {operator: 'to be a valid Express Layer, with Dispatch as handle'};
    this.obj.should.be.a.Layer();
    this.obj.name.should.eql('bound dispatch');

    if (options.regexp) {
        this.obj.regexp.toString().should.match(options.regexp);
    }

    if (options.keys) {
        this.obj.keys.should.be.an.Array().with.lengthOf(options.keys.length);
        _.map(this.obj.keys, 'name').should.eql(options.keys);
    } else {
        this.obj.keys.should.be.an.Array().with.lengthOf(0);
    }

    this.obj.route.should.be.an.Object().with.properties(['path', 'stack', 'methods']);
    if (options.route && options.route.path) {
        this.obj.route.path.should.eql(options.route.path);
    }

    if (options.route.stack) {
        this.obj.route.stack.should.be.an.Array().with.lengthOf(options.route.stack.length);
        _.map(this.obj.route.stack, 'name').should.eql(options.route.stack);
    } else {
        this.obj.route.stack.should.be.an.Array();
    }
});

should.Assertion.add('RSSRouter', function () {
    this.params = {operator: 'to be a valid RSS Router'};

    this.obj.should.be.a.RouterLayer({
        stackLength: 3,
        params: {
            key: 'page',
            value: 'handlePageParam'
        }
    });

    var routeStack = this.obj.handle.stack;

    // Layer 1 should be the handler for /rss/
    routeStack[0].should.be.a.DispatchLayer({
        route: {
            path: '/rss/',
            stack: ['doChannelConfig', 'rssConfigMiddleware', 'generate']
        }
    });

    // Layer 2 should be the handler for pagination
    routeStack[1].should.be.a.DispatchLayer({
        keys: ['page'],
        route: {
            path: '/rss/:page(\\d+)/',
            stack: ['doChannelConfig', 'rssConfigMiddleware', 'generate']
        }
    });

    // // Layer 3 should be a handler for the extra /feed/ url
    routeStack[2].should.be.a.DispatchLayer({
        route: {
            path: '/feed/',
            stack: ['redirectToRSS']
        }
    });
});

