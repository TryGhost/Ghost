const _ = require('lodash');
const Analytics = require('analytics-node');
const config = require('./config');
const common = require('./lib/common');
let analytics;

module.exports.init = function () {
    analytics = new Analytics(config.get('segment:key'));
    let toTrack;
    const trackDefaults = config.get('segment:trackDefaults') || {};
    const prefix = config.get('segment:prefix') || '';

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
