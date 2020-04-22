var _ = require('lodash'),
    Promise = require('bluebird'),
    storage = require('../../../adapters/storage'),
    replaceImage,
    ImageImporter,
    preProcessPosts,
    preProcessTags,
    preProcessUsers;

replaceImage = function (markdown, image) {
    if (!markdown) {
        return;
    }

    // Normalizes to include a trailing slash if there was one
    var regex = new RegExp('(/)?' + image.originalPath, 'gm');

    return markdown.replace(regex, image.newPath);
};

preProcessPosts = function (data, image) {
    _.each(data.posts, function (post) {
        post.markdown = replaceImage(post.markdown, image);
        if (post.html) {
            post.html = replaceImage(post.html, image);
        }
        if (post.feature_image) {
            post.feature_image = replaceImage(post.feature_image, image);
        }
        if (post.mobiledoc) {
            post.mobiledoc = replaceImage(post.mobiledoc, image);
        }
    });
};

preProcessTags = function (data, image) {
    _.each(data.tags, function (tag) {
        if (tag.feature_image) {
            tag.feature_image = replaceImage(tag.feature_image, image);
        }
    });
};

preProcessUsers = function (data, image) {
    _.each(data.users, function (user) {
        if (user.cover_image) {
            user.cover_image = replaceImage(user.cover_image, image);
        }
        if (user.profile_image) {
            user.profile_image = replaceImage(user.profile_image, image);
        }
    });
};

ImageImporter = {
    type: 'images',
    preProcess: function (importData) {
        if (!importData.images || !importData.data) {
            importData.preProcessedByImage = true;
            return importData;
        }

        var store = storage.getStorage();
        return Promise.map(importData.images, function (image) {
            return store.save(image).then(function (result) {
                return {
                    originalPath: image.originalPath,
                    newPath: result
                };
            }).then(function (image) {
                preProcessPosts(importData.data.data, image);
                preProcessTags(importData.data.data, image);
                preProcessUsers(importData.data.data, image);
            });
        }).then(function () {
            importData.preProcessedByImage = true;
            return importData;
        });
    },
    doImport: function (/*imageData*/) {
        // we do the actual importing in preProcess above. this is because some storage adapters
        // use a different host entirely to serve images - and that full url is only returned
        // by the save() API. so we must do a save to get the new image path, so that new image path
        // will be available at preprocess time.

        return Promise.resolve();
    }
};

module.exports = ImageImporter;
