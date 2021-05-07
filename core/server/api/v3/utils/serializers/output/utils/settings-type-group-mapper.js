const groupTypeMapping = {
    core: 'core',
    amp: 'blog',
    labs: 'blog',
    slack: 'blog',
    site: 'blog',
    unsplash: 'blog',
    views: 'blog',
    theme: 'theme',
    members: 'members',
    private: 'private',
    portal: 'portal',
    email: 'bulk_email',
    newsletter: 'newsletter',
    firstpromoter: 'firstpromoter',
    oauth: 'oauth',
    editor: 'editor'
};

const mapGroupToType = (group) => {
    return groupTypeMapping[group];
};

module.exports = mapGroupToType;
