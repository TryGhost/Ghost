var _       = require('lodash'),
    Promise = require('bluebird'),
    storage = require('../../../storage'),
    replaceImage,
    ImageImporter,
    preProcessPosts,
    preProcessTags,
    preProcessUsers;

replaceImage = function (markdown, image) {
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
        if (post.image) {
            post.image = replaceImage(post.image, image);
        }
    });
};

preProcessTags = function (data, image) {
    _.each(data.tags, function (tag) {
        if (tag.image) {
            tag.image = replaceImage(tag.image, image);
        }
    });
};

preProcessUsers = function (data, image) {
    _.each(data.users, function (user) {
        if (user.cover) {
            user.cover = replaceImage(user.cover, image);
        }
        if (user.image) {
            user.image = replaceImage(user.image, image);
        }
    });
};

ImageImporter = {
    type: 'images',
    preProcess: function (importData) {
        if (importData.images && importData.data) {
            _.each(importData.images, function (image) {
                preProcessPosts(importData.data.data, image);
                preProcessTags(importData.data.data, image);
                preProcessUsers(importData.data.data, image);
            });
        }

        importData.preProcessedByImage = true;
        return importData;
    },
    doImport: function (imageData) {
        var store = storage.getStorage();

        return Promise.map(imageData, function (image) {
            return store.save(image, image.targetDir).then(function (result) {
                return {originalPath: image.originalPath, newPath: image.newPath, stored: result};
            });
        });
    }
};

module.exports = ImageImporter;
