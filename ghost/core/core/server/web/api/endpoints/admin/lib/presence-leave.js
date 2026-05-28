const logging = require('@tryghost/logging');
const labs = require('../../../../../../shared/labs');
const postPresence = require('../../../../../services/post-presence');

/**
 * Explicit "I'm leaving this post" handler. Best-effort; failures never
 * error to the client. Auth is handled upstream by mw.authAdminApi.
 */
module.exports = function presenceLeave(req, res) {
    try {
        if (!labs.isSet('editorPresence')) {
            res.status(404).end();
            return;
        }
        const postId = req.params && req.params.id;
        const user = req.user;
        if (postId && user && user.id) {
            postPresence.leave(postId, user.id);
        }
    } catch (err) {
        logging.warn({err}, 'Failed to record presence leave');
    }
    res.status(204).end();
};
