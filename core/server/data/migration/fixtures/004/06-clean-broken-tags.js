// Clean tags which start with commas, the only illegal char in tags
var models  = require('../../../../models'),
    Promise = require('bluebird');

module.exports = function cleanBrokenTags(options, logInfo) {
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
                logInfo('Cleaning ' + tagOps.length + ' malformed tags');
                return Promise.all(tagOps);
            }
        }
        return Promise.resolve();
    });
};
