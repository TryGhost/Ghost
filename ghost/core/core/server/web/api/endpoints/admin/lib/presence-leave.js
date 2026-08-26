const logging = require('@tryghost/logging');
const postPresence = require('../../../../../services/post-presence');

module.exports = function presenceLeave(req, res) {
  try {
    if (req.api_key) {
      res.status(204).end();
      return;
    }
    const postId = req.params && req.params.id;
    const user = req.user;
    if (postId && user && user.id) {
      postPresence.leave(postId, user.id);
    }
  } catch (err) {
    logging.warn({ err }, 'Failed to record presence leave');
  }
  res.status(204).end();
};
