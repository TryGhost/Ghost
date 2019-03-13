const emojiRegex = require('emoji-regex');
const _ = require('lodash');

module.exports.filterEmojiCommits = (content) => {
    if (!_.isArray(content)) {
        throw new Error('Expected array of strings.');
    }

    const timestamp = /^[0-9]{10} /;
    const separator = /^\* /;
    const hash = /^\[[0-9a-f]{9}\]/;
    const url = /^\(https?:\/\/[^)]+\) /;

    return content.map((line) => {
        return '* ' + line
            .replace(timestamp, '')
            .replace(separator, '')
            .replace(hash, '')
            .replace(url, '');
    }).filter((line) => {
        const match = emojiRegex().exec(line);
        return match && match.index === 2;
    });
};

module.exports.checkMissingOptions = (options = {}, ...requiredFields) => {
    const missing = requiredFields.filter((requiredField) => {
        return !_.get(options, requiredField);
    });

    if (missing.length) {
        throw new Error(`Missing options: ${missing.join(', ')}`);
    }
};
