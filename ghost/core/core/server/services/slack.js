const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const request = require('@tryghost/request');
const {blogIcon} = require('../lib/image');
const urlUtils = require('../../shared/url-utils');
const urlService = require('./url');
const settingsCache = require('../../shared/settings-cache');
const moment = require('moment');

// Used to receive post.published model event, but also the slack.test event from the API which iirc this was done to avoid circular deps a long time ago
const events = require('../lib/common/events');

const messages = {
    requestFailedError: 'The {service} service was unable to send a ping request, your site will continue to function.',
    requestFailedHelp: 'If you get this error repeatedly, please seek help on {url}.'
};

const defaultPostSlugs = [
    'welcome',
    'the-editor',
    'using-tags',
    'managing-users',
    'private-sites',
    'advanced-markdown',
    'themes'
];

function getSlackSettings() {
    const username = settingsCache.get('slack_username');
    const url = settingsCache.get('slack_url');

    return {
        username,
        url
    };
}

/**
 * @TODO: change this function to check for the properties we depend on
 * @param {Object} data
 * @returns {boolean}
 */
function hasPostProperties(data) {
    return Object.prototype.hasOwnProperty.call(data, 'html') && Object.prototype.hasOwnProperty.call(data, 'title') && Object.prototype.hasOwnProperty.call(data, 'slug');
}

function ping(post) {
    let message;
    let title;
    let author;
    let description;
    let slackData = {};
    let slackSettings = getSlackSettings();
    let blogTitle = settingsCache.get('title');

    // If this is a post, we want to send the link of the post
    if (hasPostProperties(post)) {
        message = urlService.getUrlByResourceId(post.id, {absolute: true});
        title = post.title ? post.title : null;
        author = post.authors ? post.authors[0] : null;

        if (post.custom_excerpt) {
            description = post.custom_excerpt;
        } else if (post.html) {
            const membersContentIdx = post.html.indexOf('<!--members-only-->');
            const substringEnd = membersContentIdx > -1 ? membersContentIdx : post.html.length;

            description = `${
                post.html
                    // Remove members-only content
                    .substring(0, substringEnd)
                    // Strip out HTML
                    .replace(/<[^>]+>/g, '')
                    // Split into sentences
                    .split('.')
                    // Remove empty strings
                    .filter(sentence => sentence.trim() !== '')
                    // Get the first three sentences
                    .slice(0, 3)
                    // Join 'em back together
                    .join('.')
            }.`;
        } else {
            description = null;
        }
    } else {
        message = post.message;
    }

    // Quit here if slack integration is not activated
    if (slackSettings && slackSettings.url && slackSettings.url !== '') {
        slackSettings.username = slackSettings.username ? slackSettings.username : 'Ghost';
        // Only ping when not a page
        if (post.type === 'page') {
            return;
        }

        // Don't ping for the default posts.
        // This also handles the case where during ghost's first run
        // models.init() inserts this post but permissions.init() hasn't
        // (can't) run yet.
        if (defaultPostSlugs.indexOf(post.slug) > -1) {
            return;
        }

        if (hasPostProperties(post)) {
            slackData = {
                // We are handling the case of test notification here by checking
                // if it is a post or a test message to check webhook working.
                text: `Notification from *${blogTitle}* :ghost:`,
                unfurl_links: true,
                icon_url: blogIcon.getIconUrl({absolute: true}),
                username: slackSettings.username,
                // We don't want to send attachment if it is a test notification.
                attachments: [
                    {
                        fallback: 'Sorry, content cannot be shown.',
                        title: title,
                        title_link: message,
                        author_name: blogTitle,
                        image_url: post ? urlUtils.urlFor('image', {image: post.feature_image}, true) : null,
                        color: '#008952',
                        fields: [
                            {
                                title: 'Description',
                                value: description,
                                short: false
                            }
                        ]
                    },
                    {
                        fallback: 'Sorry, content cannot be shown.',
                        color: '#008952',
                        thumb_url: author ? urlUtils.urlFor('image', {image: author.profile_image}, true) : null,
                        fields: [
                            {
                                title: 'Author',
                                value: author ? `<${urlService.getUrlByResourceId(author.id, {absolute: true})} | ${author.name}>` : null,
                                short: true
                            }
                        ],
                        footer: blogTitle,
                        footer_icon: blogIcon.getIconUrl({absolute: true}),
                        ts: moment().unix()
                    }
                ]
            };
        } else {
            slackData = {
                text: message,
                unfurl_links: true,
                icon_url: blogIcon.getIconUrl({absolute: true}),
                username: slackSettings.username
            };
        }

        return request(slackSettings.url, {
            body: JSON.stringify(slackData),
            headers: {
                'Content-type': 'application/json'
            }
        }).catch(function (err) {
            logging.error(new errors.InternalServerError({
                err: err,
                context: tpl(messages.requestFailedError, {service: 'slack'}),
                help: tpl(messages.requestFailedHelp, {url: 'https://ghost.org/docs/'})
            }));
        });
    }
}

function slackListener(model, options) {
    // CASE: do not ping slack if we import a database
    // TODO: refactor post.published events to never fire on importing
    if (options && options.importing) {
        return;
    }

    ping({
        ...model.toJSON(),
        authors: model.related('authors').toJSON()
    });
}

function slackTestPing() {
    ping({
        message: 'Heya! This is a test notification from your Ghost blog :smile:. Seems to work fine!'
    });
}

function listen() {
    if (!events.hasRegisteredListener('post.published', 'slackListener')) {
        events.on('post.published', slackListener);
    }

    if (!events.hasRegisteredListener('slack.test', 'slackTestPing')) {
        events.on('slack.test', slackTestPing);
    }
}

// Public API
module.exports = {
    listen: listen
};
