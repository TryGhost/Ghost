var _ = require('lodash');

function getModifiedDate(data) {
    var context = data.context ? data.context : null,
        modDate;

    context = _.includes(context, 'amp') ? 'post' : context;

    if (data[context]) {
        modDate = data[context].updated_at || null;
        if (modDate) {
            return new Date(modDate).toISOString();
        }
    }
    return null;
}

module.exports = getModifiedDate;
