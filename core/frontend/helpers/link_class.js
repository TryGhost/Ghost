// # link_class helper
const _ = require('lodash');
const {config, SafeString, errors, i18n, localUtils} = require('../services/proxy');
const {buildLinkClasses} = localUtils;

module.exports = function link_class(options) { // eslint-disable-line camelcase
    options = options || {};
    options.hash = options.hash || {};
    options.data = options.data || {};

    // If there is no for provided, this is theme dev error, so we throw an error to make this clear.
    if (!_.has(options.hash, 'for')) {
        throw new errors.IncorrectUsageError({
            message: i18n.t('warnings.helpers.link_class.forIsRequired')
        });
    }

    // If the for attribute is present but empty, this is probably a dynamic data problem, hard for theme devs to track down
    // E.g. {{link_class for=slug}} in a context where slug returns an empty string
    // Error's here aren't useful (same as with empty get helper filters) so we fallback gracefully
    if (!options.hash.for) {
        options.hash.for = '';
    }

    let href = options.hash.for.string || options.hash.for;
    let classes = buildLinkClasses(config.get('url'), href, options);

    return new SafeString(classes.join(' '));
};
