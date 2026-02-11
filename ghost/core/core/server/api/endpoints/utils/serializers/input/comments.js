const {parseOrder, ensureIdTiebreaker} = require('../../../../../../services/comments/cursor-utils');

/**
 * Ensure the order string includes an id tiebreaker for deterministic keyset pagination.
 * @param {string} orderString
 * @returns {string}
 */
function ensureOrderHasIdTiebreaker(orderString) {
    const parsed = parseOrder(orderString);
    const withId = ensureIdTiebreaker(parsed);
    return withId.map(o => `${o.field} ${o.direction.toUpperCase()}`).join(', ');
}

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
    },

    browse(apiConfig, frame) {
        // for top-level comments we show newest comments first and paginate to older
        if (!frame.options.order) {
            frame.options.order = 'created_at DESC, id DESC';
        } else {
            // Ensure id tiebreaker for deterministic cursor pagination
            frame.options.order = ensureOrderHasIdTiebreaker(frame.options.order);
        }
    },

    replies(apiConfig, frame) {
        // for replies we show the oldest comments first and paginate to newer
        if (!frame.options.order) {
            frame.options.order = 'created_at ASC, id ASC';
        } else {
            // Ensure id tiebreaker for deterministic cursor pagination
            frame.options.order = ensureOrderHasIdTiebreaker(frame.options.order);
        }
    }
};
