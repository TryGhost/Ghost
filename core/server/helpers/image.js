
// Usage: `{{image}}`, `{{image absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return image permalink
// `absolute` flag outputs absolute URL, else URL is relative.

var config = require('../config'),
    image;

image = function (options) {
    var absolute = options && options.hash.absolute;

    if (this.image) {
        return config.urlFor('image', {image: this.image}, absolute);
    }
};

module.exports = image;
