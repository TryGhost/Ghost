const emojiRegex = require('emoji-regex');
const _ = require('lodash');
const {IncorrectUsageError} = require('@tryghost/errors');

const timestamp = /^[0-9]{10} /;
const separator = /^\* /;
const hash = /^\[[0-9a-f]{0,10}\]/;
const url = /^\(https?:\/\/[^)]+\) /;

const getCommitMessageFromLine = line => line
    .replace(timestamp, '')
    .replace(separator, '')
    .replace(hash, '')
    .replace(url, '');

const emojiOrder = ['💡', '🐛', '🎨', '💄', '✨', '🔒'];

module.exports.filterEmojiCommits = (content) => {
    if (!_.isArray(content)) {
        throw new IncorrectUsageError({
            message: 'Expected array of strings.'
        });
    }

    return content.reduce((emojiLines, currentLine) => {
        const commitMessage = getCommitMessageFromLine(currentLine);
        const match = emojiRegex().exec(commitMessage);

        if (match && match.index === 0) {
            return emojiLines.concat(`* ${commitMessage}`);
        }

        return emojiLines;
    }, []);
};

module.exports.sortByEmoji = (content) => {
    if (!_.isArray(content)) {
        throw new IncorrectUsageError({
            message: 'Expected array of strings.'
        });
    }

    content.sort((a, b) => {
        let firstEmoji = [...a][2];
        let secondEmoji = [...b][2];

        let firstEmojiIndex = _.indexOf(emojiOrder, firstEmoji);
        let secondEmojiIndex = _.indexOf(emojiOrder, secondEmoji);

        return secondEmojiIndex - firstEmojiIndex;
    });
};

module.exports.checkMissingOptions = (options = {}, ...requiredFields) => {
    const missing = requiredFields.filter((requiredField) => {
        return !_.get(options, requiredField);
    });

    if (missing.length) {
        throw new IncorrectUsageError({
            message: `Missing options: ${missing.join(', ')}`
        });
    }
};
