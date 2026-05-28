const logging = require('@tryghost/logging');
const labs = require('../../../../../../shared/labs');
const postPresence = require('../../../../../services/post-presence');

/**
 * Explicit "I just opened this post in the editor" handler. Called by
 * the editor route on activation so opening a post in the editor (and
 * not, say, viewing analytics) is what registers presence. Best-effort.
 */
module.exports = function presenceEnter(req, res) {
    try {
        if (!labs.isSet('editorPresence')) {
            res.status(404).end();
            return;
        }
        const postId = req.params && req.params.id;
        const user = req.user;
        if (postId && user && user.id) {
            postPresence.mark(postId, {
                id: user.id,
                name: user.get('name'),
                profileImage: user.get('profile_image')
            });
        }
    } catch (err) {
        logging.warn({err}, 'Failed to record presence enter');
    }
    res.status(204).end();
};
