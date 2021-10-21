const _ = require('lodash');
const Promise = require('bluebird');
const storage = require('../../../adapters/storage');
let replaceImage;
let ImageImporter;
let preProcessPosts;
let preProcessTags;
let preProcessUsers;

replaceImage = function (markdown, image) {
    if (!markdown) {
        return;
    }

    // Normalizes to include a trailing slash if there was one
    const regex = new RegExp('(/)?' + image.originalPath, 'gm');

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
        const store = storage.getStorage('images');

        return Promise.map(imageData, function (image) {
            return store.save(image, image.targetDir).then(function (result) {
                return {originalPath: image.originalPath, newPath: image.newPath, stored: result};
            });
        });
    }
};

module.exports = ImageImporter;
