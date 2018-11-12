const _ = require('lodash'),
    getContextObject = require('./context_object.js');

function getModifiedDate(data) {
    const context = data.context ? data.context : null,
        contextObject = getContextObject(data, context),
        modDate = _.get(contextObject, 'updated_at');

    if (modDate) {
        return new Date(modDate).toISOString();
    }
    return null;
}

module.exports = getModifiedDate;
