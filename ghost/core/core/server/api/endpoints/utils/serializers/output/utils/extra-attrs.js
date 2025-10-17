const readingMinutes = require('@tryghost/helpers').utils.readingMinutes;

/**
 *
 * @param {Object} options - frame options
 * @param {import('../../../../../../models/post')} model - Bookshelf model of Post
 * @param {Object} attrs - JSON object of Post
 * @returns {void} - modifies attrs
 */
module.exports.forPost = (options, model, attrs) => {
    // requested via `columns`
    const columnsIncludesCustomExcerpt = options.columns?.includes('custom_excerpt');
    const columnsIncludesExcerpt = options.columns?.includes('excerpt');
    const columnsIncludesPlaintext = options.columns?.includes('plaintext');
    const columnsIncludesReadingTime = options.columns?.includes('reading_time');

    // requested via `formats`
    const formatsIncludesPlaintext = options.formats?.includes('plaintext');

    // no columns requested
    const noColumnsRequested = !Object.prototype.hasOwnProperty.call(options, 'columns');

    // 1. Gets excerpt from post's plaintext. If custom_excerpt exists, it overrides the excerpt but the key remains excerpt.
    if (columnsIncludesExcerpt) {
        if (!attrs.custom_excerpt) {
            let plaintext = model.get('plaintext');
            if (plaintext) {
                attrs.excerpt = plaintext.substring(0, 500);
            } else {
                attrs.excerpt = null;
            }
        } else {
            attrs.excerpt = attrs.custom_excerpt;
        }

        if (!columnsIncludesCustomExcerpt) {
            delete attrs.custom_excerpt;
        }
    }

    if (columnsIncludesPlaintext || formatsIncludesPlaintext) {
        let plaintext = model.get('plaintext');
        if (plaintext) {
            attrs.plaintext = plaintext;
        } else {
            delete attrs.plaintext;
        }
    }

    // 3. Displays excerpt if no columns was requested - specifically needed for the Admin Posts API
    if (noColumnsRequested) {
        let customExcerpt = model.get('custom_excerpt');

        if (customExcerpt !== null) {
            attrs.excerpt = customExcerpt;
        } else {
            const plaintext = model.get('plaintext');
            if (plaintext) {
                attrs.excerpt = plaintext.substring(0, 500);
            } else {
                attrs.excerpt = null;
            }
        }
    }

    // 4. Add `reading_time` if no columns were requested, or if `reading_time` was requested via `columns`
    if (noColumnsRequested || columnsIncludesReadingTime) {
        if (attrs.html) {
            let additionalImages = 0;

            if (attrs.feature_image) {
                additionalImages += 1;
            }
            attrs.reading_time = readingMinutes(attrs.html, additionalImages);
        }
    }
};
