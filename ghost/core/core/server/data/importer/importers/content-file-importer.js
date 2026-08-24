const _ = require('lodash');
let replaceImage;
let preProcessPosts;
let preProcessTags;
let preProcessUsers;

replaceImage = function (markdown, image) {
  if (!markdown) {
    return;
  }

  const originalPaths = [image.originalPath];
  if (!image.originalPath.startsWith('content/')) {
    originalPaths.unshift(`content/${image.originalPath}`);
  }

  // Match canonical /content/{type} paths before their shorter archive path so
  // replacing images/image.jpg cannot leave an extra /content prefix behind.
  // Consume __GHOST_URL__ too: newPath already contains the configured subdir
  // and the model will normalize it back to transform-ready form on write.
  const escapedPaths = originalPaths.map((originalPath) => _.escapeRegExp(originalPath));
  const regex = new RegExp(`(?:__GHOST_URL__)?/?(?:${escapedPaths.join('|')})`, 'gm');

  return markdown.replace(regex, image.newPath);
};

/**
 * @param {Object} data
 * @param {Object[]} data.posts
 * @param {Object} contentFile
 * @param {string} contentFile.originalPath
 * @param {string} contentFile.newPath
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
    if (post.og_image) {
      post.og_image = replaceImage(post.og_image, contentFile);
    }
    if (post.twitter_image) {
      post.twitter_image = replaceImage(post.twitter_image, contentFile);
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

  /** @property {import('ghost-storage-base').StorageBase} */
  #store;

  /**
   *
   * @param {Object} deps
   * @param {'images' | 'media' | 'files'} deps.type - importer type
   * @param {import('ghost-storage-base').StorageBase} deps.store
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
  async doImport(contentFilesData) {
    const store = this.#store;

    const results = await Promise.allSettled(
      contentFilesData.map(function (contentFile) {
        return store.save(contentFile, contentFile.targetDir).then(function (result) {
          return {
            originalPath: contentFile.originalPath,
            newPath: contentFile.newPath,
            stored: result,
          };
        });
      }),
    );

    const failure = results.find((result) => result.status === 'rejected');
    if (failure) {
      throw failure.reason;
    }

    return results.map((result) => result.value);
  }
}

module.exports = ContentFileImporter;
