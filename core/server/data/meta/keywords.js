var visibilityFilter = require('../../utils/visibility').filter;

function getKeywords(data) {
    if (data.post && data.post.tags && data.post.tags.length > 0) {
        return visibilityFilter(data.post.tags, ['public'], false, function processItem(item) {
            return item.name;
        });
    }
    return null;
}

module.exports = getKeywords;
