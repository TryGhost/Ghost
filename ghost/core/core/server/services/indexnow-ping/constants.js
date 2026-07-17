const messages = {
    requestFailedError: 'The {service} service was unable to send a ping request, your site will continue to function.',
    requestFailedHelp: 'If you get this error repeatedly, please seek help on {url}.'
};

const INDEXNOW_LOG_KEY = '[indexnow]';

// IndexNow endpoint - this routes to all participating search engines
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

const defaultPostSlugs = [
    'welcome',
    'the-editor',
    'using-tags',
    'managing-users',
    'private-sites',
    'advanced-markdown',
    'themes',
    'coming-soon'
];

// Fields that affect how the post appears in search engine results
const seoFields = [
    'html', // Post content
    'title', // Post title (appears in SERP)
    'slug', // URL path
    'meta_title', // Custom meta title
    'meta_description', // Meta description (appears in SERP)
    'canonical_url', // Canonical URL
    'status' // Published status change
];

module.exports = {
    messages,
    INDEXNOW_LOG_KEY,
    INDEXNOW_ENDPOINT,
    defaultPostSlugs,
    seoFields
};
