var _ = require('lodash'),
    Analytics = require('analytics-node'),
    config = require('./config'),
    common = require('./lib/common'),
    analytics;

module.exports.init = function () {
    analytics = new Analytics(config.get('segment:key'));
    var toTrack,
        trackDefaults = config.get('segment:trackDefaults') || {},
        prefix = config.get('segment:prefix') || '';

    toTrack = [
        {
            event: 'post.published',
            name: 'Blog Post Published'
        },
        {
            event: 'page.published',
            name: 'Blog Page Published'
        }
    ];

    _.each(toTrack, function (track) {
        common.events.on(track.event, function () {
            analytics.track(_.extend(trackDefaults, {event: prefix + track.name}));
        });
    });
};
