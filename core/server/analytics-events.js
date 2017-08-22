var _ = require('lodash'),
    config = require('./config'),
    events = require('./events'),
    Analytics = require('analytics-node'),
    analytics;

module.exports.init = function () {
    analytics = new Analytics(config.get('segment:key'));
    var toTrack,
        trackDefaults = config.get('segment:trackDefaults') || {},
        prefix = config.get('segment:prefix') || '';

    toTrack = [
        {
            event: 'post.added',
            name: 'Blog Post Created'
        },
        {
            event: 'post.published',
            name: 'Blog Post Published'
        },
        {
            event: 'page.published',
            name: 'Blog Page Published'
        },
        {
            event: 'user.added',
            name: 'User Invite Sent'
        },
        {
            event: 'user.activated',
            name: 'User Invite Activated'
        },
        {
            event: 'user.activated.edited',
            name: 'User Account Updated'
        },
        {
            event: 'subscriber.added',
            name: 'New Subscriber Added'
        },
        {
            event: 'token.added',
            name: 'Access Token Added'
        },
        {
            event: 'setup.completed',
            name: 'Created Owner Account'
        },
        {
            event: 'theme.uploaded',
            name: 'Uploaded Theme'
        },
        {
            event: 'theme.downloaded',
            name: 'Downloaded Theme'
        },
        {
            event: 'theme.deleted',
            name: 'Deleted Theme'
        }
    ];

    _.each(toTrack, function (track) {
        events.on(track.event, function () {
            analytics.track(_.extend(trackDefaults, {event: prefix + track.name}));
        });
    });
};
