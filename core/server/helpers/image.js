
// Usage: `{{image}}`, `{{image absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return image permalink
// `absolute` flag outputs absolute URL, else URL is relative.

var proxy = require('./proxy'),
    url = proxy.url;

module.exports = function image(options) {
    var absolute = options && options.hash.absolute;

    // tag && post
    if (this.feature_image) {
        return url.urlFor('image', {image: this.feature_image}, absolute);
    }

    // author
    if (this.profile_image) {
        return url.urlFor('image', {image: this.profile_image}, absolute);
    }
};
