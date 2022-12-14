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
    }
};
