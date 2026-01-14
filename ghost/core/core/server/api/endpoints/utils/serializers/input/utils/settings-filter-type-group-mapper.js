const typeGroupMapping = {
    core: [
        'core'
    ],
    blog: [
        'site',
        'labs',
        'slack',
        'unsplash',
        'views'
    ],
    theme: [
        'theme'
    ],
    members: [
        'members'
    ],
    private: [
        'private'
    ],
    portal: [
        'portal'
    ],
    bulk_email: [
        'email'
    ],
    site: [
        'site'
    ]
};

const mapTypeToGroup = (typeOptions) => {
    const types = typeOptions.split(',');

    const mappedTypes = types.map((type) => {
        const sanitizedType = type ? type.trim() : null;

        return typeGroupMapping[sanitizedType];
    }).filter(type => !!type);

    return mappedTypes.join(',');
};

module.exports = mapTypeToGroup;
