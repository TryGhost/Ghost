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
            name: 'Post Published'
        },
        {
            event: 'page.published',
            name: 'Page Published'
        },
        {
            event: 'theme.uploaded',
            name: 'Theme Uploaded'
        },
        {
            event: 'integration.added',
            name: 'Custom Integration Added'
        }
    ];

    _.each(toTrack, function (track) {
        common.events.on(track.event, function () {
            analytics.track(_.extend(trackDefaults, {event: prefix + track.name}));
        });
    });
};
