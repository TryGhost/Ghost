const groupTypeMapping = {
    core: 'core',
    amp: 'blog',
    labs: 'blog',
    slack: 'blog',
    unsplash: 'blog',
    views: 'blog',
    theme: 'theme',
    members: 'members',
    private: 'private',
    portal: 'portal',
    email: 'bulk_email',
    site: 'site'
};

const mapGroupToType = (group) => {
    return groupTypeMapping[group];
};

module.exports = mapGroupToType;
