
// Usage: `{{image}}`, `{{image absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return image permalink
// `absolute` flag outputs absolute URL, else URL is relative.

var Promise         = require('bluebird'),
    config          = require('../config'),
    image;

image = function (options) {
    var absolute = options && options.hash.absolute;
    if (this.image) {
        return Promise.resolve(config.urlFor('image', {image: this.image}, absolute));
    } else {
        return Promise.resolve();
    }
};

module.exports = image;
