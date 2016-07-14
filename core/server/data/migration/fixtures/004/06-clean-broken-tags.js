// Clean tags which start with commas, the only illegal char in tags
var models = require('../../../../models'),
    Promise = require('bluebird'),
    message = 'Cleaning malformed tags';

module.exports = function cleanBrokenTags(options, logger) {
    return models.Tag.findAll(options).then(function (tags) {
        var tagOps = [];

        if (tags) {
            tags.each(function (tag) {
                var name = tag.get('name'),
                    updated = name.replace(/^(,+)/, '').trim();

                // If we've ended up with an empty string, default to just 'tag'
                updated = updated === '' ? 'tag' : updated;

                if (name !== updated) {
                    tagOps.push(tag.save({name: updated}, options));
                }
            });
            if (tagOps.length > 0) {
                logger.info(message + '(' + tagOps.length + ')');
                return Promise.all(tagOps);
            } else {
                logger.warn(message);
            }
        } else {
            logger.warn(message);
        }
    });
};
