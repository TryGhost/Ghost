const logging = require('@tryghost/logging');
const models = require('../../../../../models');
const postPresence = require('../../../../../services/post-presence');
const permissionsService = require('../../../../../services/permissions');

function lookupErrorStatus(err) {
  if (!err) {
    return null;
  }
  if (err.errorType === 'NoPermissionError' || err.statusCode === 403) {
    return 403;
  }
  if (err.errorType === 'NotFoundError' || err.statusCode === 404) {
    return 404;
  }
  return null;
}

module.exports = async function presenceEnter(req, res) {
  try {
    if (req.api_key) {
      res.status(204).end();
      return;
    }
    const postId = req.params && req.params.id;
    const user = req.user;
    if (!postId || !user || !user.id) {
      res.status(204).end();
      return;
    }

    let post;
    try {
      await permissionsService.canThis({ user: user.id }).edit.post(postId);
      post = await models.Post.findOne(
        { id: postId, status: 'all' },
        {
          context: { user: user.id },
          withRelated: ['authors'],
        },
      );
    } catch (err) {
      const status = lookupErrorStatus(err);
      if (status) {
        res.status(status).end();
        return;
      }
      logging.warn({ err, postId, userId: user.id }, 'presence-enter: post lookup failed');
      res.status(204).end();
      return;
    }
    if (!post) {
      res.status(404).end();
      return;
    }

    const authorIds = post.related('authors').map((author) => author.get('id'));
    postPresence.mark(
      postId,
      {
        id: user.id,
        name: user.get('name'),
        profileImage: user.get('profile_image'),
      },
      { authorIds },
    );
  } catch (err) {
    logging.warn({ err }, 'Failed to record presence enter');
  }
  res.status(204).end();
};
