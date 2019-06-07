const ghostHelperUtils = require('@tryghost/helpers').utils;

function getKeywords(data) {
    if (data.post && data.post.tags && data.post.tags.length > 0) {
        return ghostHelperUtils.visibility.filter(data.post.tags, ['public'], function processItem(item) {
            return item.name;
        });
    }
    return null;
}

module.exports = getKeywords;
