var labs            = require('../../utils/labs');

function getKeywords(data) {
    if (data.post && data.post.tags && data.post.tags.length > 0) {
        return data.post.tags.reduce(function (tags, tag) {
            if (tag.visibility !== 'internal' || !labs.isSet('internalTags')) {
                tags.push(tag.name);
            }
            return tags;
        }, []);
    }
    return null;
}

module.exports = getKeywords;

