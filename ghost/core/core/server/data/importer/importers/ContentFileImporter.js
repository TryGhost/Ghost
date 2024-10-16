const _ = require('lodash');
let replaceImage;
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

/**
 * @param {Object} data
 * @param {Object[]} data.posts
 * @param {Object} contentFile
 * @param {String} contentFile.originalPath
 * @param {String} contentFile.newPath
 */
preProcessPosts = function (data, contentFile) {
    _.each(data.posts, function (post) {
        post.markdown = replaceImage(post.markdown, contentFile);
        if (post.html) {
            post.html = replaceImage(post.html, contentFile);
        }
        if (post.feature_image) {
            post.feature_image = replaceImage(post.feature_image, contentFile);
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

class ContentFileImporter {
    /** @property {string} */
    type;

    /** @property {import('ghost-storage-base')} */
    #store;

    /**
     *
     * @param {Object} deps
     * @param {'images' | 'media' | 'files'} deps.type - importer type
     * @param {import('ghost-storage-base')} deps.store
     */
    constructor(deps) {
        this.type = deps.type;
        this.#store = deps.store;
    }

    preProcess(importData) {
        if (this.type === 'images') {
            if (importData.images && importData.data && importData.data.data) {
                _.each(importData.images, function (image) {
                    preProcessPosts(importData.data.data, image);
                    preProcessTags(importData.data.data, image);
                    preProcessUsers(importData.data.data, image);
                });
            }

            importData.preProcessedByImage = true;
        }

        // @NOTE: the type === 'media' check does not belong here and should be abstracted away
        //        to make this importer more generic
        if (this.type === 'media') {
            if (importData.media && importData.data && importData.data.data) {
                _.each(importData.media, function (file) {
                    preProcessPosts(importData.data.data, file);
                });
            }

            importData.preProcessedByMedia = true;
        }

        if (this.type === 'files') {
            if (importData.files && importData.data && importData.data.data) {
                _.each(importData.files, function (file) {
                    preProcessPosts(importData.data.data, file);
                });
            }

            importData.preProcessedByFiles = true;
        }

        return importData;
    }

    /**
     *
     * @param {Object[]} contentFilesData
     * @returns
     */
    doImport(contentFilesData) {
        const store = this.#store;

        return Promise.all(contentFilesData.map(function (contentFile) {
            return store.save(contentFile, contentFile.targetDir).then(function (result) {
                return {originalPath: contentFile.originalPath, newPath: contentFile.newPath, stored: result};
            });
        }));
    }
}

module.exports = ContentFileImporter;
