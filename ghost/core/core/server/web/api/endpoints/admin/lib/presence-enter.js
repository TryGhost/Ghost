const logging = require('@tryghost/logging');
const labs = require('../../../../../../shared/labs');
const models = require('../../../../../models');
const postPresence = require('../../../../../services/post-presence');

/**
 * Explicit "I just opened this post in the editor" handler. Looks up
 * the post through the user's context so Ghost's permission system
 * rejects the call if the user can't read the post — that also keeps
 * a Contributor from injecting their avatar onto posts they can't
 * access. The post's author IDs are passed through so the SSE handler
 * can filter events to other Authors/Contributors.
 */
module.exports = async function presenceEnter(req, res) {
    try {
        if (!labs.isSet('editorPresence')) {
            res.status(404).end();
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
            post = await models.Post.findOne(
                {id: postId, status: 'all'},
                {
                    context: {user: user.id},
                    withRelated: ['authors']
                }
            );
        } catch (err) {
            // Permission denied or other lookup failure — don't mark.
            res.status(403).end();
            return;
        }
        if (!post) {
            res.status(404).end();
            return;
        }

        const authorIds = post
            .related('authors')
            .map(author => author.get('id'));

        postPresence.mark(
            postId,
            {
                id: user.id,
                name: user.get('name'),
                profileImage: user.get('profile_image')
            },
            {authorIds}
        );
    } catch (err) {
        logging.warn({err}, 'Failed to record presence enter');
    }
    res.status(204).end();
};
