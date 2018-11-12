const models = require('../../models'),
    getContextObject = require('./context_object.js'),
    _ = require('lodash');

function getKeywords(data) {
    let context = data.context ? data.context : null,
        contextObject = getContextObject(data, context),
        tags = _.get(contextObject, 'tags');
    if (_.isArray(tags) && tags.length) {
        return models.Base.Model.filterByVisibility(tags, ['public'], false, function processItem(item) {
            return item.name;
        });
    }
    return null;
}

module.exports = getKeywords;
