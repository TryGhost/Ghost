module.exports = [
    // Drop hidden column from tags table
    require('./01-drop-hidden-column-from-tags'),
    // Add visibility column to posts, tags, and users tables
    require('./02-add-visibility-column-to-key-tables'),
    // Add mobiledoc column to posts
    require('./03-add-mobiledoc-column-to-posts'),
    // Add social media columns to users
    require('./04-add-social-media-columns-to-users'),
    // Add subscribers table
    require('./05-add-subscribers-table')
];
