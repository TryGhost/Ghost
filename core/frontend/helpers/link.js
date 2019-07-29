// # link helper
const _ = require('lodash');
const {config, SafeString, errors, i18n} = require('./proxy');
const {buildLinkClasses} = require('./utils');

const managedAttributes = ['href', 'class', 'activeClass', 'parentActiveClass'];

function _formatAttrs(attributes) {
    let attributeString = '';
    Object.keys(attributes).forEach((key) => {
        let value = attributes[key];

        // @TODO handle non-string attributes?
        attributeString += `${key}="${value}"`;
    });

    return attributeString;
}

module.exports = function link(options) {
    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    // If there is no href provided, this is theme dev error, so we throw an error to make this clear.
    if (!_.has(options.hash, 'href')) {
        throw new errors.IncorrectUsageError({
            message: i18n.t('warnings.helpers.link.hrefIsRequired')
        });
    }
    // If the href attribute is empty, this is probably a dynamic data problem, hard for theme devs to track down
    // E.g. {{#link for=slug}}{{/link}} in a context where slug returns an empty string
    // Error's here aren't useful (same as with empty get helper filters) so we fallback gracefully
    if (!options.hash.href) {
        options.hash.href = '';
    }

    let href = options.hash.href.string || options.hash.href;

    // Calculate dynamic properties
    let classes = buildLinkClasses(config.get('url'), href, options);

    // Remove all the attributes we don't want to do a one-to-one mapping of
    managedAttributes.forEach((attr) => {
        delete options.hash[attr];
    });

    // Setup our one-to-one mapping of attributes;
    let attributes = options.hash;

    // Prepare output
    let classString = classes.length > 0 ? `class="${classes.join(' ')}"` : '';
    let hrefString = `href="${href}"`;
    let attributeString = _.size(attributes) > 0 ? _formatAttrs(attributes) : '';
    let openingTag = `<a ${classString} ${hrefString} ${attributeString}>`;
    let closingTag = `</a>`;

    // Clean up any extra spaces
    openingTag = openingTag.replace(/\s{2,}/g, ' ').replace(/\s>/, '>');

    return new SafeString(`${openingTag}${options.fn(this)}${closingTag}`);
};
