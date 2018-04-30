const unidecode = require('unidecode'),
    _ = require('lodash');

module.exports.safe = function safe(string, options) {
    options = options || {};

    if (string === null) {
        string = '';
    }

    // Handle the £ symbol separately, since it needs to be removed before the unicode conversion.
    string = string.replace(/£/g, '-');

    // Remove non ascii characters
    string = unidecode(string);

    // Replace URL reserved chars: `@:/?#[]!$&()*+,;=` as well as `\%<>|^~£"{}` and \`
    string = string.replace(/(\s|\.|@|:|\/|\?|#|\[|\]|!|\$|&|\(|\)|\*|\+|,|;|=|\\|%|<|>|\||\^|~|"|\{|\}|`|–|—)/g, '-')
    // Remove apostrophes
        .replace(/'/g, '')
        // Make the whole thing lowercase
        .toLowerCase();

    // We do not need to make the following changes when importing data
    if (!_.has(options, 'importing') || !options.importing) {
        // Convert 2 or more dashes into a single dash
        string = string.replace(/-+/g, '-')
        // Remove trailing dash
            .replace(/-$/, '')
            // Remove any dashes at the beginning
            .replace(/^-/, '');
    }

    // Handle whitespace at the beginning or end.
    string = string.trim();

    return string;
};
