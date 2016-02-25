module.exports = [
    // add jquery setting and privacy info
    require('./01-move-jquery-with-alert'),

    // change `type` for protected blog `isPrivate` setting
    require('./02-update-private-setting-type'),

    // change `type` for protected blog `password` setting
    require('./03-update-password-setting-type'),

    // Update ghost-admin client fixture
    require('./04-update-ghost-admin-client'),

    // add ghost-frontend client if missing
    require('./05-add-ghost-frontend-client'),

    // clean up broken tags
    require('./06-clean-broken-tags'),

    // Add post_tag order
    require('./07-add-post-tag-order'),

    // Add a new draft post
    require('./08-add-post-fixture')
];
