const urlService = require('../../../../../services/url');

module.exports = {
    all(_apiConfig, frame) {
        if (!frame.options.withRelated || frame.options.withRelated.length === 0) {
            return;
        }

        // Map reaction shortcut relations to count relations
        frame.options.withRelated = frame.options.withRelated.map((relation) => {
            if (relation === 'liked') {
                return 'count.liked';
            }
            if (relation === 'replies.liked') {
                return 'replies.count.liked';
            }
            if (relation === 'disliked') {
                return 'count.disliked';
            }
            if (relation === 'replies.disliked') {
                return 'replies.count.disliked';
            }
            return relation;
        });

        if (frame.options.withRelated.includes('post')) {
            for (const relation of urlService.facade.getRequiredRelations()) {
                const prefixed = `post.${relation}`;
                if (!frame.options.withRelated.includes(prefixed)) {
                    frame.options.withRelated.push(prefixed);
                }
            }
        }
    },

    browse(apiConfig, frame) {
        // for top-level comments we show newest comments first and paginate to older
        if (!frame.options.order) {
            frame.options.order = 'created_at DESC, id DESC';
        }
    },

    replies(apiConfig, frame) {
        // for replies we show the oldest comments first and paginate to newer
        if (!frame.options.order) {
            frame.options.order = 'created_at ASC, id ASC';
        }
    }
};
