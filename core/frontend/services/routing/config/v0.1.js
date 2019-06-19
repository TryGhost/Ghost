/* eslint-disable */
module.exports.QUERY = {
    tag: {
        controller: 'tags',
        type: 'read',
        resource: 'tags',
        options: {
            slug: '%s',
            visibility: 'public'
        }
    },
    author: {
        resourceAlias: 'authors',
        controller: 'users',
        type: 'read',
        resource: 'users',
        options: {
            slug: '%s',
            visibility: 'public'
        }
    },
    user: {
        resourceAlias: 'authors',
        controller: 'users',
        type: 'read',
        resource: 'users',
        options: {
            slug: '%s',
            visibility: 'public'
        }
    },
    post: {
        controller: 'posts',
        type: 'read',
        resource: 'posts',
        options: {
            slug: '%s',
            status: 'published',
            page: 0
        }
    },
    page: {
        controller: 'posts',
        type: 'read',
        resource: 'posts',
        options: {
            slug: '%s',
            status: 'published',
            page: 1
        }
    },
    preview: {
        controller: 'posts',
        resource: 'posts'
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
