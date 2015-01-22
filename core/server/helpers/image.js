// Usage: `{{image}}`, `{{image absolute="true"}}`
//
// Returns the URL for the current object scope i.e. If inside a post scope will return image permalink
// `absolute` flag outputs absolute URL, else URL is relative.

var config = require('../config'),
    image;

image = function (options) {
    var absolute = options && options.hash.absolute,
        imgPath = this.image;
    if (this.image) {
        // cdn assets
        // 如果设定了cdn，那么对内容添加cdn
        if (config['cdn'] && config['cdn']['assets']) {
            imgPath = config['cdn']['assets'] + this.image;
        }
        return config.urlFor('image', {image: imgPath}, absolute);
    }
};

module.exports = image;
