var config = require('../../config');

function getContextObject(data, context) {
    var blog = config.theme,
        contextObject;

    context = context === 'page' ? 'post' : context;
    contextObject = data[context] || blog;

    return contextObject;
}

module.exports = getContextObject;
