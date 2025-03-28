const getContextObject = require('./context-object.js');

function getModifiedDate(data) {
    let context = data.context ? data.context : null;
    let modDate;

    const contextObject = getContextObject(data, context);

    if (contextObject) {
        modDate = contextObject.updated_at || null;
        if (modDate) {
            return new Date(modDate).toISOString();
        }
    }
    return null;
}

module.exports = getModifiedDate;
