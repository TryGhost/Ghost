/* eslint-disable */
module.exports.QUERY = {
    tag: {
        controller: 'tagsPublic',
        type: 'read',
        resource: 'tags',
        options: {
            slug: '%s',
            visibility: 'public'
        }
    },
    author: {
        controller: 'authors',
        type: 'read',
        resource: 'authors',
        options: {
            slug: '%s'
        }
    },
    post: {
        controller: 'posts',
        type: 'read',
        resource: 'posts',
        options: {
            slug: '%s'
        }
    },
    page: {
        controller: 'pages',
        type: 'read',
        resource: 'pages',
        options: {
            slug: '%s'
        }
    },
    preview: {
        controller: 'preview',
        resource: 'preview'
    }
};

module.exports.TAXONOMIES = {
    tag: {
        filter: 'tags:\'%s\'+tags.visibility:public',
        editRedirect: '#/settings/tags/:slug/',
        resource: 'tags'
    },
    author: {
        filter: 'authors:\'%s\'',
        editRedirect: '#/team/:slug/',
        resource: 'authors'
    }
};
/* eslint-enable */
