const {readingMinutes} = require('@tryghost/helpers').utils;

/**
 * Calculate reading time for a post
 * @param {string} html - Post HTML content
 * @param {string|null} featureImage - Feature image URL (or null)
 * @returns {number} Reading time in minutes
 */
function calculatePostReadingTime(html, featureImage) {
    const additionalImages = featureImage ? 1 : 0;
    return readingMinutes(html, additionalImages);
}

module.exports = {
    calculatePostReadingTime
};