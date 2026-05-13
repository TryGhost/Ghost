// # Social Accounts Helper
// Usage:
//   {{#social_accounts @site}}
//       <a href="{{href}}" target="_blank" rel="noopener" aria-label="{{name}}">
//           {{> (concat "icons/" type)}}
//       </a>
//   {{/social_accounts}}
//
// Iterates over the social accounts on the given source object in canonical
// order, yielding `{type, href, username, name}` for each platform with a
// username set.
//
// A source must be passed explicitly:
//   {{#social_accounts @site}}    - site-level accounts
//   {{#social_accounts author}}   - a specific author
//   {{#social_accounts this}}     - the current context (e.g. inside {{#foreach authors}})
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const {socialUrls} = require('../services/proxy');
const {hbs} = require('../services/handlebars');

const createFrame = hbs.handlebars.createFrame;

const messages = {
    sourceRequired: 'The {{#social_accounts}} helper requires a source argument, e.g. {{#social_accounts @site}}...{{/social_accounts}}.',
    blockRequired: 'The {{#social_accounts}} helper must be used as a block helper, e.g. {{#social_accounts @site}}...{{/social_accounts}}.'
};

// Canonical order mirrors the admin settings UI (SOCIAL_PLATFORM_KEYS).
const SOCIAL_PLATFORMS = [
    {type: 'twitter', name: 'X'},
    {type: 'facebook', name: 'Facebook'},
    {type: 'linkedin', name: 'LinkedIn'},
    {type: 'bluesky', name: 'Bluesky'},
    {type: 'threads', name: 'Threads'},
    {type: 'mastodon', name: 'Mastodon'},
    {type: 'tiktok', name: 'TikTok'},
    {type: 'youtube', name: 'YouTube'},
    {type: 'instagram', name: 'Instagram'}
];

module.exports = function social_accounts(source, options) { // eslint-disable-line camelcase
    // {{#social_accounts}} with no positional arg: handlebars passes only options.
    if (arguments.length < 2) {
        throw new errors.IncorrectUsageError({
            level: 'normal',
            message: tpl(messages.sourceRequired),
            help: 'https://ghost.org/docs/themes/helpers/social-accounts/'
        });
    }

    options = options || {};
    options.data = options.data || {};

    const {fn, inverse, data} = options;

    if (typeof fn !== 'function') {
        throw new errors.IncorrectUsageError({
            level: 'normal',
            message: tpl(messages.blockRequired),
            help: 'https://ghost.org/docs/themes/helpers/social-accounts/'
        });
    }

    const accounts = SOCIAL_PLATFORMS.reduce((acc, {type, name}) => {
        const username = source && source[type];
        if (username && typeof socialUrls[type] === 'function') {
            acc.push({type, name, username, href: socialUrls[type](username)});
        }
        return acc;
    }, []);

    if (!accounts.length) {
        return inverse ? inverse(this) : '';
    }

    const frame = createFrame(data);
    let output = '';

    accounts.forEach((account, index) => {
        frame.index = index;
        frame.number = index + 1;
        frame.first = index === 0;
        frame.last = index === accounts.length - 1;
        frame.even = index % 2 === 1;
        frame.odd = !frame.even;
        output += fn(account, {data: frame});
    });

    return output;
};
