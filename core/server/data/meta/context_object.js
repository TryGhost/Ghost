var config = require('../../config'),
    _      = require('lodash');

function getContextObject(data, context) {
    var blog = config.theme,
        contextObject;

    context = _.includes(context, 'page') ? 'post' : context;
    contextObject = data[context] || blog;
    return contextObject;
}

module.exports = getContextObject;
