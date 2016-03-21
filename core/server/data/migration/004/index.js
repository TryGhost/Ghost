module.exports = [
    // Added tour column to users
    require('./01-add-tour-column-to-users'),
    // Added sort_order to posts_tags
    require('./02-add-sortorder-column-to-poststags'),
    // Added redirection_uri, logo, status, type & description columns to clients
    require('./03-add-many-columns-to-clients'),
    // Added client_trusted_domains table
    require('./04-add-clienttrusteddomains-table'),
    // Dropped unique index on client secret
    require('./05-drop-unique-on-clients-secret')
];
