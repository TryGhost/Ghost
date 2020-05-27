const _ = require('lodash');
const Analytics = require('analytics-node');
const config = require('../shared/config');
const {events} = require('./lib/common');

module.exports.init = function () {
    const analytics = new Analytics(config.get('segment:key'));
    const trackDefaults = config.get('segment:trackDefaults') || {};
    const prefix = config.get('segment:prefix') || '';

    const toTrack = [
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
        events.on(track.event, function () {
            analytics.track(_.extend(trackDefaults, {event: prefix + track.name}));
        });
    });
};
