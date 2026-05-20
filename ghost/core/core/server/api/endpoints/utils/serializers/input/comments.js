module.exports = {
    all(_apiConfig, frame) {
        if (!frame.options.withRelated || frame.options.withRelated.length === 0) {
            return;
        }

        // Map the 'liked' relation to 'count.liked'
        frame.options.withRelated = frame.options.withRelated.map((relation) => {
            if (relation === 'liked') {
                return 'count.liked';
            }
            if (relation === 'replies.liked') {
                return 'replies.count.liked';
            }
            return relation;
        });

        // If the caller asked for `post`, also load post.tags / post.authors
        // — the comments output mapper calls url.forPost on the embedded
        // post, which needs the relations to resolve tag/author-filtered
        // routes under lazyRouting.
        if (frame.options.withRelated.includes('post')) {
            if (!frame.options.withRelated.includes('post.tags')) {
                frame.options.withRelated.push('post.tags');
            }
            if (!frame.options.withRelated.includes('post.authors')) {
                frame.options.withRelated.push('post.authors');
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
