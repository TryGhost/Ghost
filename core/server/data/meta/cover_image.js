var config = require('../../config');

function getCoverImage(data) {
    var context = data.context ? data.context[0] : null,
        blog = config.theme,
        contextObject = data[context] || blog;

    if (context === 'home' || context === 'author') {
        if (contextObject.cover) {
            return config.urlFor('image', {image: contextObject.cover}, true);
        }
    } else {
        if (contextObject.image) {
            return config.urlFor('image', {image: contextObject.image}, true);
        }
    }
    return null;
}

module.exports = getCoverImage;
