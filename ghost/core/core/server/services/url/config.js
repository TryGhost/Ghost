/*
 * These are the default resources and filters.
 * They contain minimum filters for public accessibility of resources.
 *
 * Each `include` list enumerates the exact columns fetched from the database
 * for that resource type.  Only fields needed for:
 *  - URL generation (permalink patterns, NQL route-filter evaluation)
 *  - sitemap XML (dates, images, canonical_url exclusion)
 *  - runtime change detection (_containsRoutingAffectingChanges)
 * are included.
 */
module.exports = [
    {
        type: 'posts',
        modelOptions: {
            modelName: 'Post',
            filter: 'status:published+type:post',
            include: [
                'id',
                'slug',
                'type',
                'featured',
                'visibility',
                'published_at',
                'created_at',
                'updated_at',
                'feature_image',
                'canonical_url'
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
            filter: 'status:published+type:page',
            include: [
                'id',
                'slug',
                'type',
                'featured',
                'visibility',
                'published_at',
                'created_at',
                'updated_at',
                'feature_image',
                'canonical_url'
            ]
        },
        events: {
            add: 'page.published',
            update: 'page.published.edited',
            remove: 'page.unpublished'
        }
    },
    {
        type: 'tags',
        keep: ['id', 'slug'],
        modelOptions: {
            modelName: 'Tag',
            filter: 'visibility:public',
            include: [
                'id',
                'name',
                'slug',
                'visibility',
                'feature_image',
                'canonical_url',
                'created_at',
                'updated_at'
            ],
            shouldHavePosts: {
                joinTo: 'tag_id',
                joinTable: 'posts_tags'
            }
        },
        events: {
            add: 'tag.added',
            update: ['tag.edited', 'tag.attached', 'tag.detached'],
            remove: 'tag.deleted'
        }
    },
    {
        type: 'authors',
        modelOptions: {
            modelName: 'User',
            filter: 'visibility:public',
            include: [
                'id',
                'name',
                'slug',
                'visibility',
                'profile_image',
                'cover_image',
                'created_at',
                'updated_at'
            ],
            shouldHavePosts: {
                joinTo: 'author_id',
                joinTable: 'posts_authors'
            }
        },
        events: {
            add: 'user.activated',
            update: ['user.activated.edited', 'user.attached', 'user.detached'],
            remove: 'user.deleted'
        }
    }
];
