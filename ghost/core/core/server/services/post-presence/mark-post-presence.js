const logging = require('@tryghost/logging');
const postPresence = require('./index');

function getPostData(post) {
  if (!post) {
    return null;
  }
  if (typeof post.toJSON === 'function') {
    return post.toJSON();
  }
  return post;
}

/**
 * Best-effort presence heartbeat fired from editor saves. Presence
 * failures must never break the parent posts/pages API response.
 *
 * @param {Object} frame API framework frame
 * @param {Object} post Post DTO or Bookshelf model
 */
module.exports = function markPostPresence(frame, post) {
  try {
    if (!frame || !frame.user || !post) {
      return;
    }
    if (frame.options?.context?.api_key) {
      return;
    }

    const postData = getPostData(post);
    if (!postData?.id) {
      return;
    }

    const postContext = Array.isArray(postData.authors)
      ? {
          authorIds: postData.authors.map((author) => author?.id).filter(Boolean),
        }
      : undefined;

    postPresence.mark(
      postData.id,
      {
        id: frame.user.id,
        name: frame.user.get('name'),
        profileImage: frame.user.get('profile_image'),
      },
      postContext,
    );
  } catch (err) {
    logging.warn({ err }, 'Failed to record post presence');
  }
};
