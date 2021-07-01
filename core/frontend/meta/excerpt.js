const generateExcerpt = require('./generate-excerpt');

function getExcerpt(data) {
    // NOTE: should use 'post' OR 'page' once https://github.com/TryGhost/Ghost/issues/10042 is resolved
    if (!data.post) {
        return;
    }
    // There's a specific order for description fields (not <meta name="description" /> !!) in structured data
    // and schema.org which is used the description fields (see https://github.com/TryGhost/Ghost/issues/8793):
    // 1. CASE: custom_excerpt is populated via the UI
    // 2. CASE: no custom_excerpt, but meta_description is poplated via the UI
    // 3. CASE: fall back to automated excerpt of 50 words if neither custom_excerpt nor meta_description is provided
    // @TODO: https://github.com/TryGhost/Ghost/issues/10062
    const customExcerpt = data.post.excerpt || data.post.custom_excerpt;
    const metaDescription = data.post.meta_description;
    const fallbackExcerpt = data.post.html ? generateExcerpt(data.post.html, {words: 50}) : '';

    return customExcerpt ? customExcerpt : metaDescription ? metaDescription : fallbackExcerpt;
}

module.exports = getExcerpt;
