const models = require('../../models');

function getKeywords(data) {
    if (data.post && data.post.tags && data.post.tags.length > 0) {
        return models.Base.Model.filterByVisibility(data.post.tags, ['public'], false, function processItem(item) {
            return item.name;
        });
    }
    return null;
}

module.exports = getKeywords;
