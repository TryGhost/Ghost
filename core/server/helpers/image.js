
// Usage: `{{image}}`, `{{image absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return image permalink
// `absolute` flag outputs absolute URL, else URL is relative.

var utils  = require('../utils'),
    image;

image = function (options) {
    var absolute = options && options.hash.absolute;

    if (this.image) {
        return utils.url.urlFor('image', {image: this.image}, absolute);
    }
};

module.exports = image;
