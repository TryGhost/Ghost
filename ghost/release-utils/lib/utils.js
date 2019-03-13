const emojiRegex = require('emoji-regex');
const _ = require('lodash');

module.exports.filterEmojiCommits = (content) => {
    if (!_.isArray(content)) {
        throw new Error('Expected array of strings.');
    }

    content = content.filter(function (line, index, obj) {
        const sqbracket = line.substring(line.indexOf('['), line.indexOf(']') + 1);
        const rdbracket = line.substring(line.indexOf('('), line.indexOf(')') + 2);
        const contributor = line.substring(line.lastIndexOf('-') - 1, line.length);

        // NOTE: modify original line
        line = line.replace(sqbracket, '');
        line = line.replace(rdbracket, '');
        line = line.replace(contributor, '');
        obj[index] = line;

        const match = emojiRegex().exec(line);
        return match && match.index === 2;
    });

    return content;
};

module.exports.checkMissingOptions = (options = {}, ...requiredFields) => {
    const missing = requiredFields.filter((requiredField) => {
        return !_.get(options, requiredField);
    });

    if (missing.length) {
        throw new Error(`Missing options: ${missing.join(', ')}`);
    }
};
