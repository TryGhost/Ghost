const url = require('../utils/url');

module.exports = (attrs) => {
    url.forSettings(attrs);

    return attrs;
};
