/*
 * These are the default resources and filters.
 * They contain minimum filters for public accessibility of resources.
 */

module.exports = [
    {
        type: 'posts',
        modelOptions: {
            modelName: 'Post',
            filter: 'visibility:public+status:published+page:false',
            exclude: [
                'title',
                'mobiledoc',
                'html',
                'plaintext',
                'amp',
                'codeinjection_head',
                'codeinjection_foot',
                'meta_title',
                'meta_description',
                'custom_excerpt',
                'og_image',
                'og_title',
                'og_description',
                'twitter_image',
                'twitter_title',
                'twitter_description',
                'custom_template',
                'feature_image',
                'locale'
            ],
            withRelated: ['tags', 'authors'],
            withRelatedPrimary: {
                primary_tag: 'tags',
                primary_author: 'authors'
            },
            withRelatedFields: {
                tags: ['tags.id', 'tags.slug'],
                authors: ['users.id', 'users.slug']
            }
        },
        events: {
            add: 'post.published',
            update: 'post.published.edited',
            remove: 'post.unpublished'
        }
    },
    {
        type: 'pages',
        modelOptions: {
            modelName: 'Post',
            exclude: [
                'title',
                'mobiledoc',
                'html',
                'plaintext',
                'amp',
                'codeinjection_head',
                'codeinjection_foot',
                'meta_title',
                'meta_description',
                'custom_excerpt',
                'og_image',
                'og_title',
                'og_description',
                'twitter_image',
                'twitter_title',
                'twitter_description',
                'custom_template',
                'feature_image',
                'locale',
                'tags',
                'authors',
                'primary_tag',
                'primary_author'
            ],
            filter: 'visibility:public+status:published+page:true'
        },
        events: {
            add: 'page.published',
            update: 'page.published.edited',
            remove: 'page.unpublished'
        }
    },
    {
        type: 'tags',
        keep: ['id', 'slug', 'updated_at', 'created_at'],
        modelOptions: {
            modelName: 'Tag',
            exclude: ['description', 'meta_title', 'meta_description'],
            filter: 'visibility:public'
        },
        events: {
            add: 'tag.added',
            update: 'tag.edited',
            remove: 'tag.deleted'
        }
    },
    {
        type: 'authors',
        modelOptions: {
            modelName: 'User',
            exclude: [
                'bio',
                'website',
                'location',
                'facebook',
                'twitter',
                'accessibility',
                'meta_title',
                'meta_description',
                'tour'
            ],
            filter: 'visibility:public'
        },
        events: {
            add: 'user.activated',
            update: 'user.activated.edited',
            remove: 'user.deleted'
        }
    }
];
