const axios = require('axios');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const request = require('@tryghost/request');
const { blogIcon } = require('../lib/image');
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

function postToot(baseUrl, username, password, message) {
	console.log('postToot', message, 'sending request to pleroma')
    let basicAuth = Buffer.from(`${username}:${password}`).toString('base64')
    return request(`${baseUrl}/api/v1/statuses`, {
			  method: 'POST',
			  body: JSON.stringify({ status: message }),
        headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/json'
        }
    })
}

function getPleromaSettings() {
    const username = settingsCache.get('pleroma_username');
    const password = settingsCache.get('pleroma_password');
    const url = settingsCache.get('pleroma_url');

    return {
        username,
        password,
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

function tootPost(post) {
	console.log('tootPost',post)
    let message;
    let title;
    let author;
    let description;
    let slackData = {};
    let pleromaSettings = getPleromaSettings();
    let blogTitle = settingsCache.get('title');

	console.log(pleromaSettings)

    // If this is a post, we want to send the link of the post
    if (hasPostProperties(post)) {
        message = urlService.getUrlByResourceId(post.id, { absolute: true });
        title = post.title ? post.title : null;
        author = post.authors ? post.authors[0] : null;

        if (post.custom_excerpt) {
            description = post.custom_excerpt;
        } else if (post.html) {
            description = `${post.html.replace(/<[^>]+>/g, '').split('.').slice(0, 3).join('.')}.`;
        } else {
            description = null;
        }
    } else {
        message = post.message;
    }


    // Quit here if slack integration is not activated
    if (pleromaSettings && pleromaSettings.url && pleromaSettings.url !== '') {
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
            return postToot(pleromaSettings.url, pleromaSettings.username, pleromaSettings.password, post.title)
                .catch(function (err) {
                    logging.error(new errors.InternalServerError({
                        err: err,
                        context: tpl(messages.requestFailedError, { service: 'pleroma' }),
                        help: tpl(messages.requestFailedHelp, { url: 'https://ghost.org/docs/' })
                    }));
                });
        }
    }
}

function listener(model, options) {
    // CASE: do not ping slack if we import a database
    // TODO: refactor post.published events to never fire on importing
    if (options && options.importing) {
        return;
    }

    tootPost(model.toJSON());
}

function testPing() {
	console.log('test ping pleroma')
    tootPost({
        title: 'test pleroma-ghost integration',
			  type: 'post',
			  html: '',
			  slug: 'ping',
    });
}

function listen() {
    events.on('post.published', listener);
    events.on('pleroma.test', testPing);
}

// Public API
module.exports = {
    listen: listen
};
