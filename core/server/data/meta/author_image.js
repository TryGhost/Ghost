var config = require('../../config');

function getAuthorImage(data, absolute) {
    var context = data.context ? data.context[0] : null,
        blog = config.theme,
        contextObject = data[context] || blog;

    if (context === 'post' && contextObject.author && contextObject.author.image) {
        return config.urlFor('image', {image: contextObject.author.image}, absolute);
    }
    return null;
}

module.exports = getAuthorImage;
