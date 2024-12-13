/* String Column Sizes Information
 * (From: https://github.com/TryGhost/Ghost/pull/7932)
 *
 * Small strings = length 50
 * Medium strings = length 191
 * Large strings = length 1000-2000
 * Text = length 65535 (64 KiB)
 * Long text = length 1,000,000,000
 */
module.exports = {
    newsletters: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        uuid: {type: 'string', maxlength: 36, nullable: false, unique: true, validations: {isUUID: true}},
        name: {type: 'string', maxlength: 191, nullable: false, unique: true},
        description: {type: 'string', maxlength: 2000, nullable: true},
        feedback_enabled: {type: 'boolean', nullable: false, defaultTo: false},
        slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
        sender_name: {type: 'string', maxlength: 191, nullable: true},
        sender_email: {type: 'string', maxlength: 191, nullable: true},
        sender_reply_to: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'newsletter'},
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'active', validations: {isIn: [['active', 'archived']]}},
        visibility: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'members'
        },
        subscribe_on_signup: {type: 'boolean', nullable: false, defaultTo: true},
        sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
        header_image: {type: 'string', maxlength: 2000, nullable: true},
        show_header_icon: {type: 'boolean', nullable: false, defaultTo: true},
        show_header_title: {type: 'boolean', nullable: false, defaultTo: true},
        show_excerpt: {type: 'boolean', nullable: false, defaultTo: false},
        title_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif', validations: {isIn: [['serif', 'sans_serif']]}},
        title_alignment: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'center', validations: {isIn: [['center', 'left']]}},
        show_feature_image: {type: 'boolean', nullable: false, defaultTo: true},
        body_font_category: {type: 'string', maxlength: 191, nullable: false, defaultTo: 'sans_serif', validations: {isIn: [['serif', 'sans_serif']]}},
        footer_content: {type: 'text', maxlength: 1000000000, nullable: true},
        show_badge: {type: 'boolean', nullable: false, defaultTo: true},
        show_header_name: {type: 'boolean', nullable: false, defaultTo: true},
        show_post_title_section: {type: 'boolean', nullable: false, defaultTo: true},
        show_comment_cta: {type: 'boolean', nullable: false, defaultTo: true},
        show_subscription_details: {type: 'boolean', nullable: false, defaultTo: false},
        show_latest_posts: {type: 'boolean', nullable: false, defaultTo: false},
        background_color: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'light'},
        border_color: {type: 'string', maxlength: 50, nullable: true},
        title_color: {type: 'string', maxlength: 50, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    },
    posts: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        uuid: {type: 'string', maxlength: 36, nullable: false, validations: {isUUID: true}},
        title: {type: 'string', maxlength: 2000, nullable: false, validations: {isLength: {max: 255}}},
        slug: {type: 'string', maxlength: 191, nullable: false},
        mobiledoc: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        lexical: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        html: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        comment_id: {type: 'string', maxlength: 50, nullable: true},
        plaintext: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        feature_image: {type: 'string', maxlength: 2000, nullable: true},
        featured: {type: 'boolean', nullable: false, defaultTo: false},
        type: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'post', validations: {isIn: [['post', 'page']]}},
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'draft', validations: {isIn: [['published', 'draft', 'scheduled', 'sent']]}},
        // NOTE: unused at the moment and reserved for future features
        locale: {type: 'string', maxlength: 6, nullable: true},
        visibility: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'public'
        },
        email_recipient_filter: {
            type: 'text',
            maxlength: 1000000000,
            nullable: false
        },
        created_at: {type: 'dateTime', nullable: false},
        /**
         * @deprecated: https://github.com/TryGhost/Ghost/issues/10286
         *
         * This is valid for all x_by fields.
         */
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true, index: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true},
        published_at: {type: 'dateTime', nullable: true, index: true},
        published_by: {type: 'string', maxlength: 24, nullable: true},
        custom_excerpt: {type: 'string', maxlength: 2000, nullable: true, validations: {isLength: {max: 300}}},
        codeinjection_head: {type: 'text', maxlength: 65535, nullable: true},
        codeinjection_foot: {type: 'text', maxlength: 65535, nullable: true},
        custom_template: {type: 'string', maxlength: 100, nullable: true},
        canonical_url: {type: 'text', maxlength: 2000, nullable: true},
        newsletter_id: {type: 'string', maxlength: 24, nullable: true, references: 'newsletters.id'},
        show_title_and_feature_image: {type: 'boolean', nullable: false, defaultTo: true},
        '@@INDEXES@@': [
            ['type','status','updated_at']
        ],
        '@@UNIQUE_CONSTRAINTS@@': [
            ['slug', 'type']
        ]
    },
    posts_meta: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id', unique: true},
        og_image: {type: 'string', maxlength: 2000, nullable: true},
        og_title: {type: 'string', maxlength: 300, nullable: true},
        og_description: {type: 'string', maxlength: 500, nullable: true},
        twitter_image: {type: 'string', maxlength: 2000, nullable: true},
        twitter_title: {type: 'string', maxlength: 300, nullable: true},
        twitter_description: {type: 'string', maxlength: 500, nullable: true},
        meta_title: {type: 'string', maxlength: 2000, nullable: true, validations: {isLength: {max: 300}}},
        meta_description: {type: 'string', maxlength: 2000, nullable: true, validations: {isLength: {max: 500}}},
        email_subject: {type: 'string', maxlength: 300, nullable: true},
        frontmatter: {type: 'text', maxlength: 65535, nullable: true},
        feature_image_alt: {type: 'string', maxlength: 191, nullable: true},
        feature_image_caption: {type: 'text', maxlength: 65535, nullable: true},
        email_only: {type: 'boolean', nullable: false, defaultTo: false}
    },
    // NOTE: this is the staff table
    users: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 191, nullable: false},
        slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
        password: {type: 'string', maxlength: 60, nullable: false},
        email: {type: 'string', maxlength: 191, nullable: false, unique: true, validations: {isEmail: true}},
        profile_image: {type: 'string', maxlength: 2000, nullable: true},
        cover_image: {type: 'string', maxlength: 2000, nullable: true},
        bio: {type: 'text', maxlength: 65535, nullable: true, validations: {isLength: {max: 200}}},
        website: {type: 'string', maxlength: 2000, nullable: true, validations: {isEmptyOrURL: true}},
        location: {type: 'text', maxlength: 65535, nullable: true, validations: {isLength: {max: 150}}},
        facebook: {type: 'string', maxlength: 2000, nullable: true},
        twitter: {type: 'string', maxlength: 2000, nullable: true},
        accessibility: {type: 'text', maxlength: 65535, nullable: true},
        status: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'active',
            validations: {
                isIn: [[
                    'active',
                    'inactive',
                    'locked',
                    'warn-1',
                    'warn-2',
                    'warn-3',
                    'warn-4'
                ]]
            }
        },
        // NOTE: unused at the moment and reserved for future features
        locale: {type: 'string', maxlength: 6, nullable: true},
        visibility: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'public',
            validations: {isIn: [['public']]}
        },
        meta_title: {type: 'string', maxlength: 2000, nullable: true, validations: {isLength: {max: 300}}},
        meta_description: {type: 'string', maxlength: 2000, nullable: true, validations: {isLength: {max: 500}}},
        tour: {type: 'text', maxlength: 65535, nullable: true},
        // NOTE: Used to determine whether a user has logged in previously
        last_seen: {type: 'dateTime', nullable: true},
        comment_notifications: {type: 'boolean', nullable: false, defaultTo: true},
        free_member_signup_notification: {type: 'boolean', nullable: false, defaultTo: true},
        paid_subscription_started_notification: {type: 'boolean', nullable: false, defaultTo: true},
        paid_subscription_canceled_notification: {type: 'boolean', nullable: false, defaultTo: false},
        mention_notifications: {type: 'boolean', nullable: false, defaultTo: true},
        recommendation_notifications: {type: 'boolean', nullable: false, defaultTo: true},
        milestone_notifications: {type: 'boolean', nullable: false, defaultTo: true},
        donation_notifications: {type: 'boolean', nullable: false, defaultTo: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    posts_authors: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id'},
        author_id: {type: 'string', maxlength: 24, nullable: false, references: 'users.id'},
        sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}
    },
    roles: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 50, nullable: false, unique: true},
        description: {type: 'string', maxlength: 2000, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    roles_users: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        role_id: {type: 'string', maxlength: 24, nullable: false},
        user_id: {type: 'string', maxlength: 24, nullable: false}
    },
    permissions: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 50, nullable: false, unique: true},
        object_type: {type: 'string', maxlength: 50, nullable: false},
        action_type: {type: 'string', maxlength: 50, nullable: false},
        object_id: {type: 'string', maxlength: 24, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    permissions_users: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        user_id: {type: 'string', maxlength: 24, nullable: false},
        permission_id: {type: 'string', maxlength: 24, nullable: false}
    },
    permissions_roles: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        role_id: {type: 'string', maxlength: 24, nullable: false},
        permission_id: {type: 'string', maxlength: 24, nullable: false}
    },
    settings: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        group: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'core',
            validations: {
                isIn: [[
                    'amp',
                    'core',
                    'email',
                    'labs',
                    'members',
                    'portal',
                    'private',
                    'site',
                    'slack',
                    'theme',
                    'unsplash',
                    'views'
                ]]
            }
        },
        key: {type: 'string', maxlength: 50, nullable: false, unique: true},
        // NOTE: as JSON objects are no longer stored in `value` we could potentially reduce the maxlength
        value: {type: 'text', maxlength: 65535, nullable: true},
        type: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            validations: {
                isIn: [[
                    'array',
                    'string',
                    'number',
                    'boolean',
                    'object'
                ]]
            }
        },
        flags: {type: 'string', maxlength: 50, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    tags: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 191, nullable: false, validations: {matches: /^([^,]|$)/}},
        slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
        description: {type: 'text', maxlength: 65535, nullable: true, validations: {isLength: {max: 500}}},
        feature_image: {type: 'string', maxlength: 2000, nullable: true},
        parent_id: {type: 'string', nullable: true},
        visibility: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'public',
            validations: {isIn: [['public', 'internal']]}
        },
        og_image: {type: 'string', maxlength: 2000, nullable: true},
        og_title: {type: 'string', maxlength: 300, nullable: true},
        og_description: {type: 'string', maxlength: 500, nullable: true},
        twitter_image: {type: 'string', maxlength: 2000, nullable: true},
        twitter_title: {type: 'string', maxlength: 300, nullable: true},
        twitter_description: {type: 'string', maxlength: 500, nullable: true},
        meta_title: {type: 'string', maxlength: 2000, nullable: true, validations: {isLength: {max: 300}}},
        meta_description: {type: 'string', maxlength: 2000, nullable: true, validations: {isLength: {max: 500}}},
        codeinjection_head: {type: 'text', maxlength: 65535, nullable: true},
        codeinjection_foot: {type: 'text', maxlength: 65535, nullable: true},
        canonical_url: {type: 'string', maxlength: 2000, nullable: true},
        accent_color: {type: 'string', maxlength: 50, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    posts_tags: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id'},
        tag_id: {type: 'string', maxlength: 24, nullable: false, references: 'tags.id'},
        sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
        '@@INDEXES@@': [
            ['post_id','tag_id']
        ]
    },
    invites: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        role_id: {type: 'string', maxlength: 24, nullable: false},
        status: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'pending',
            validations: {isIn: [['pending', 'sent']]}
        },
        token: {type: 'string', maxlength: 191, nullable: false, unique: true},
        email: {type: 'string', maxlength: 191, nullable: false, unique: true, validations: {isEmail: true}},
        expires: {type: 'bigInteger', nullable: false},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    brute: {
        key: {type: 'string', maxlength: 191, primary: true},
        firstRequest: {type: 'bigInteger'},
        lastRequest: {type: 'bigInteger'},
        lifetime: {type: 'bigInteger'},
        count: {type: 'integer'}
    },
    sessions: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        session_id: {type: 'string', maxlength: 32, nullable: false, unique: true},
        user_id: {type: 'string', maxlength: 24, nullable: false},
        session_data: {type: 'string', maxlength: 2000, nullable: false},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    },
    integrations: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        type: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'custom',
            validations: {isIn: [['internal', 'builtin', 'custom', 'core']]}
        },
        name: {type: 'string', maxlength: 191, nullable: false},
        slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
        icon_image: {type: 'string', maxlength: 2000, nullable: true},
        description: {type: 'string', maxlength: 2000, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    webhooks: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        event: {type: 'string', maxlength: 50, nullable: false, validations: {isLowercase: true}},
        target_url: {type: 'string', maxlength: 2000, nullable: false},
        name: {type: 'string', maxlength: 191, nullable: true},
        secret: {type: 'string', maxlength: 191, nullable: true},
        // @NOTE: the defaultTo does not make sense to set on DB layer as it leads to unnecessary maintenance every major release
        //       would be ideal if we can remove the default and instead have "isIn" validation checking if it's a valid version e.g: 'v3', 'v4', 'canary'
        api_version: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'v2'},
        // NOTE: integration_id column needs "nullable: true" -> "nullable: false" migration (recreate table with nullable: false)
        // CASE: Ghost instances initialized pre 4.0 will have this column set to nullable: true in db schema
        integration_id: {type: 'string', maxlength: 24, nullable: false, references: 'integrations.id', cascadeDelete: true},
        last_triggered_at: {type: 'dateTime', nullable: true},
        last_triggered_status: {type: 'string', maxlength: 50, nullable: true},
        last_triggered_error: {type: 'string', maxlength: 50, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    api_keys: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        type: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            validations: {isIn: [['content', 'admin']]}
        },
        secret: {
            type: 'string',
            maxlength: 191,
            nullable: false,
            unique: true,
            validations: {isLength: {min: 26, max: 128}}
        },
        role_id: {type: 'string', maxlength: 24, nullable: true},
        // integration_id is nullable to allow "internal" API keys that don't show in the UI
        integration_id: {type: 'string', maxlength: 24, nullable: true},
        user_id: {type: 'string', maxlength: 24, nullable: true},
        last_seen_at: {type: 'dateTime', nullable: true},
        last_seen_version: {type: 'string', maxlength: 50, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    mobiledoc_revisions: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        post_id: {type: 'string', maxlength: 24, nullable: false, index: true},
        mobiledoc: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        created_at_ts: {type: 'bigInteger', nullable: false},
        created_at: {type: 'dateTime', nullable: false}
    },
    post_revisions: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        post_id: {type: 'string', maxlength: 24, nullable: false, index: true},
        lexical: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        created_at_ts: {type: 'bigInteger', nullable: false},
        created_at: {type: 'dateTime', nullable: false},
        author_id: {type: 'string', maxlength: 24, nullable: true, references: 'users.id', cascadeDelete: false, constraintName: 'post_revs_author_id_foreign'},
        title: {type: 'string', maxlength: 2000, nullable: true, validations: {isLength: {max: 255}}},
        post_status: {type: 'string', maxlength: 50, nullable: true, validations: {isIn: [['draft', 'published', 'scheduled', 'sent']]}},
        reason: {type: 'string', maxlength: 50, nullable: true},
        feature_image: {type: 'string', maxlength: 2000, nullable: true},
        feature_image_alt: {type: 'string', maxlength: 191, nullable: true},
        feature_image_caption: {type: 'text', maxlength: 65535, nullable: true},
        custom_excerpt: {type: 'string', maxlength: 2000, nullable: true, validations: {isLength: {max: 300}}}
    },
    members: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        uuid: {type: 'string', maxlength: 36, nullable: true, unique: true, validations: {isUUID: true}},
        transient_id: {type: 'string', maxlength: 191, nullable: false, unique: true},
        email: {type: 'string', maxlength: 191, nullable: false, unique: true, validations: {isEmail: true}},
        status: {
            type: 'string', maxlength: 50, nullable: false, defaultTo: 'free', validations: {
                isIn: [['free', 'paid', 'comped']]
            }
        },
        name: {type: 'string', maxlength: 191, nullable: true},
        expertise: {type: 'string', maxlength: 191, nullable: true, validations: {isLength: {max: 50}}},
        note: {type: 'string', maxlength: 2000, nullable: true},
        geolocation: {type: 'string', maxlength: 2000, nullable: true},
        enable_comment_notifications: {type: 'boolean', nullable: false, defaultTo: true},
        email_count: {type: 'integer', unsigned: true, nullable: false, defaultTo: 0},
        email_opened_count: {type: 'integer', unsigned: true, nullable: false, defaultTo: 0},
        email_open_rate: {type: 'integer', unsigned: true, nullable: true, index: true},
        email_disabled: {type: 'boolean', nullable: false, defaultTo: false},
        last_seen_at: {type: 'dateTime', nullable: true},
        last_commented_at: {type: 'dateTime', nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    // NOTE: this is the tiers table
    products: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 191, nullable: false},
        slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
        // @deprecated: use a status enum with isIn validation, not an `active` boolean
        active: {type: 'boolean', nullable: false, defaultTo: true},
        welcome_page_url: {type: 'string', maxlength: 2000, nullable: true},
        visibility: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'none',
            validations: {isIn: [['public', 'none']]}
        },
        trial_days: {type: 'integer', unsigned: true, nullable: false, defaultTo: 0},
        description: {type: 'string', maxlength: 191, nullable: true},
        type: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'paid',
            validations: {
                isIn: [['paid', 'free']]
            }
        },
        currency: {type: 'string', maxlength: 50, nullable: true},
        monthly_price: {type: 'integer', unsigned: true, nullable: true},
        yearly_price: {type: 'integer', unsigned: true, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        // To be removed in future
        monthly_price_id: {type: 'string', maxlength: 24, nullable: true},
        yearly_price_id: {type: 'string', maxlength: 24, nullable: true}
    },
    offers: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        // @deprecated: use a status enum with isIn validation, not an `active` boolean
        active: {type: 'boolean', nullable: false, defaultTo: true},
        name: {type: 'string', maxlength: 191, nullable: false, unique: true},
        code: {type: 'string', maxlength: 191, nullable: false, unique: true},
        product_id: {type: 'string', maxlength: 24, nullable: false, references: 'products.id'},
        stripe_coupon_id: {type: 'string', maxlength: 255, nullable: true, unique: true},
        interval: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['month', 'year']]}},
        currency: {type: 'string', maxlength: 50, nullable: true},
        discount_type: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['percent', 'amount', 'trial']]}},
        discount_amount: {type: 'integer', nullable: false},
        duration: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['trial', 'once', 'repeating', 'forever']]}},
        duration_in_months: {type: 'integer', nullable: true},
        portal_title: {type: 'string', maxlength: 191, nullable: true},
        portal_description: {type: 'string', maxlength: 2000, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    },
    benefits: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 191, nullable: false},
        slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    },
    products_benefits: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        product_id: {type: 'string', maxlength: 24, nullable: false, references: 'products.id', cascadeDelete: true},
        benefit_id: {type: 'string', maxlength: 24, nullable: false, references: 'benefits.id', cascadeDelete: true},
        sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}
    },
    members_products: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        product_id: {type: 'string', maxlength: 24, nullable: false, references: 'products.id', cascadeDelete: true},
        sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
        expiry_at: {type: 'dateTime', nullable: true}
    },
    posts_products: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id', cascadeDelete: true},
        product_id: {type: 'string', maxlength: 24, nullable: false, references: 'products.id', cascadeDelete: true},
        sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}
    },
    members_created_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        created_at: {type: 'dateTime', nullable: false},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        attribution_id: {type: 'string', maxlength: 24, nullable: true, index: true},
        attribution_type: {
            type: 'string', maxlength: 50, nullable: true, validations: {
                isIn: [['url', 'post', 'page', 'author', 'tag']]
            }
        },
        attribution_url: {type: 'string', maxlength: 2000, nullable: true},
        referrer_source: {type: 'string', maxlength: 191, nullable: true},
        referrer_medium: {type: 'string', maxlength: 191, nullable: true},
        referrer_url: {type: 'string', maxlength: 2000, nullable: true},
        source: {
            type: 'string', maxlength: 50, nullable: false, validations: {
                isIn: [['member', 'import', 'system', 'api', 'admin']]
            }
        },
        batch_id: {type: 'string', maxlength: 24, nullable: true}
    },
    members_cancel_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        from_plan: {type: 'string', maxlength: 255, nullable: false},
        created_at: {type: 'dateTime', nullable: false}
    },
    members_payment_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        amount: {type: 'integer', nullable: false},
        // @note: this is longer than originally intended due to a bug - https://github.com/TryGhost/Ghost/pull/15606
        // so we should decide whether we should reduce it down in the future
        currency: {type: 'string', maxlength: 191, nullable: false},
        source: {type: 'string', maxlength: 50, nullable: false},
        created_at: {type: 'dateTime', nullable: false}
    },
    members_login_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        created_at: {type: 'dateTime', nullable: false}
    },
    members_email_change_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        to_email: {type: 'string', maxlength: 191, nullable: false, unique: false, validations: {isEmail: true}},
        from_email: {type: 'string', maxlength: 191, nullable: false, unique: false, validations: {isEmail: true}},
        created_at: {type: 'dateTime', nullable: false}
    },
    members_status_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        from_status: {
            type: 'string', maxlength: 50, nullable: true, validations: {
                isIn: [['free', 'paid', 'comped']]
            }
        },
        to_status: {
            type: 'string', maxlength: 50, nullable: true, validations: {
                isIn: [['free', 'paid', 'comped']]
            }
        },
        created_at: {type: 'dateTime', nullable: false}
    },
    members_product_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        product_id: {type: 'string', maxlength: 24, nullable: false, references: 'products.id', cascadeDelete: false},
        action: {
            type: 'string', maxlength: 50, nullable: true, validations: {
                isIn: [['added', 'removed']]
            }
        },
        created_at: {type: 'dateTime', nullable: false}
    },
    members_paid_subscription_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        type: {type: 'string', maxlength: 50, nullable: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        subscription_id: {type: 'string', maxlength: 24, nullable: true},
        from_plan: {type: 'string', maxlength: 255, nullable: true},
        to_plan: {type: 'string', maxlength: 255, nullable: true},
        // @note: this is longer than originally intended due to a bug - https://github.com/TryGhost/Ghost/pull/15606
        // so we should decide whether we should reduce it down in the future
        currency: {type: 'string', maxlength: 191, nullable: false},
        source: {
            type: 'string', maxlength: 50, nullable: false, validations: {
                isIn: [['stripe']]
            }
        },
        mrr_delta: {type: 'integer', nullable: false},
        created_at: {type: 'dateTime', nullable: false}
    },
    labels: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 191, nullable: false, unique: true},
        slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    members_labels: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        label_id: {type: 'string', maxlength: 24, nullable: false, references: 'labels.id', cascadeDelete: true},
        sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}
    },
    members_stripe_customers: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'members.id', cascadeDelete: true},
        customer_id: {type: 'string', maxlength: 255, nullable: false, unique: true},
        name: {type: 'string', maxlength: 191, nullable: true},
        email: {type: 'string', maxlength: 191, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    subscriptions: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        type: {
            type: 'string', maxlength: 50, nullable: false, validations: {
                isIn: [['free', 'comped', 'paid']]
            }
        },
        status: {
            type: 'string', maxlength: 50, nullable: false, validations: {
                isIn: [['active', 'expired', 'canceled']]
            }
        },
        member_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'members.id', cascadeDelete: true},
        tier_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'products.id'},

        // These are null if type !== 'paid'
        cadence: {
            type: 'string', maxlength: 50, nullable: true, validations: {
                isIn: [['month', 'year']]
            }
        },
        currency: {type: 'string', maxlength: 50, nullable: true},
        amount: {type: 'integer', nullable: true},

        // e.g. 'stripe'
        payment_provider: {type: 'string', maxlength: 50, nullable: true},
        // e.g. Stripe Subscription Link
        payment_subscription_url: {type: 'string', maxlength: 2000, nullable: true},
        // e.g. Stripe Customer Link
        payment_user_url: {type: 'string', maxlength: 2000, nullable: true},

        offer_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'offers.id'},

        expires_at: {type: 'dateTime', nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    },
    members_stripe_customers_subscriptions: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        customer_id: {type: 'string', maxlength: 255, nullable: false, unique: false, references: 'members_stripe_customers.customer_id', cascadeDelete: true},
        ghost_subscription_id: {type: 'string', maxlength: 24, nullable: true, references: 'subscriptions.id', constraintName: 'mscs_ghost_subscription_id_foreign', cascadeDelete: true},
        subscription_id: {type: 'string', maxlength: 255, nullable: false, unique: true},
        stripe_price_id: {type: 'string', maxlength: 255, nullable: false, unique: false, index: true, defaultTo: ''},
        status: {type: 'string', maxlength: 50, nullable: false},
        cancel_at_period_end: {type: 'boolean', nullable: false, defaultTo: false},
        cancellation_reason: {type: 'string', maxlength: 500, nullable: true},
        current_period_end: {type: 'dateTime', nullable: false},
        start_date: {type: 'dateTime', nullable: false},
        default_payment_card_last4: {type: 'string', maxlength: 4, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true},
        mrr: {type: 'integer', unsigned: true, nullable: false, defaultTo: 0},
        offer_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'offers.id'},
        trial_start_at: {type: 'dateTime', nullable: true},
        trial_end_at: {type: 'dateTime', nullable: true},
        /* Below fields are now redundant as we link stripe_price_id to stripe_prices table */
        plan_id: {type: 'string', maxlength: 255, nullable: false, unique: false},
        plan_nickname: {type: 'string', maxlength: 50, nullable: false},
        plan_interval: {type: 'string', maxlength: 50, nullable: false},
        plan_amount: {type: 'integer', nullable: false},
        // @note: this is longer than originally intended due to a bug - https://github.com/TryGhost/Ghost/pull/15606
        // so we should decide whether we should reduce it down in the future
        plan_currency: {type: 'string', maxlength: 191, nullable: false}
    },
    members_subscription_created_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        created_at: {type: 'dateTime', nullable: false},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        subscription_id: {type: 'string', maxlength: 24, nullable: false, references: 'members_stripe_customers_subscriptions.id', cascadeDelete: true},
        attribution_id: {type: 'string', maxlength: 24, nullable: true, index: true},
        attribution_type: {
            type: 'string', maxlength: 50, nullable: true, validations: {
                isIn: [['url', 'post', 'page', 'author', 'tag']]
            }
        },
        attribution_url: {type: 'string', maxlength: 2000, nullable: true},
        referrer_source: {type: 'string', maxlength: 191, nullable: true},
        referrer_medium: {type: 'string', maxlength: 191, nullable: true},
        referrer_url: {type: 'string', maxlength: 2000, nullable: true},
        batch_id: {type: 'string', maxlength: 24, nullable: true}
    },
    offer_redemptions: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        offer_id: {type: 'string', maxlength: 24, nullable: false, references: 'offers.id', cascadeDelete: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        subscription_id: {type: 'string', maxlength: 24, nullable: false, references: 'members_stripe_customers_subscriptions.id', cascadeDelete: true},
        created_at: {type: 'dateTime', nullable: false}
    },
    members_subscribe_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'members.id', cascadeDelete: true},
        subscribed: {type: 'boolean', nullable: false, defaultTo: true},
        created_at: {type: 'dateTime', nullable: false},
        source: {
            type: 'string', maxlength: 50, nullable: true, validations: {
                isIn: [['member', 'import', 'system', 'api', 'admin']]
            }
        },
        newsletter_id: {type: 'string', maxlength: 24, nullable: true, references: 'newsletters.id', cascadeDelete: false}
    },
    donation_payment_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 191, nullable: true},
        email: {type: 'string', maxlength: 191, nullable: false, unique: false, validations: {isEmail: true}},
        member_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'members.id', setNullDelete: true},
        amount: {type: 'integer', nullable: false},
        currency: {type: 'string', maxlength: 50, nullable: false},
        attribution_id: {type: 'string', maxlength: 24, nullable: true},
        attribution_type: {
            type: 'string', maxlength: 50, nullable: true, validations: {
                isIn: [['url', 'post', 'page', 'author', 'tag']]
            }
        },
        attribution_url: {type: 'string', maxlength: 2000, nullable: true},
        referrer_source: {type: 'string', maxlength: 191, nullable: true},
        referrer_medium: {type: 'string', maxlength: 191, nullable: true},
        referrer_url: {type: 'string', maxlength: 2000, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        donation_message: {type: 'string', maxlength: 255, nullable: true} // https://docs.stripe.com/payments/checkout/custom-fields
    },
    stripe_products: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        product_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'products.id'},
        stripe_product_id: {type: 'string', maxlength: 255, nullable: false, unique: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    },
    stripe_prices: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        stripe_price_id: {type: 'string', maxlength: 255, nullable: false, unique: true},
        stripe_product_id: {type: 'string', maxlength: 255, nullable: false, unique: false, references: 'stripe_products.stripe_product_id'},
        active: {type: 'boolean', nullable: false},
        nickname: {type: 'string', maxlength: 255, nullable: true},
        // @note: this is longer than originally intended due to a bug - https://github.com/TryGhost/Ghost/pull/15606
        // so we should decide whether we should reduce it down in the future
        currency: {type: 'string', maxlength: 191, nullable: false},
        amount: {type: 'integer', nullable: false},
        type: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'recurring', validations: {isIn: [['recurring', 'one_time', 'donation']]}},
        interval: {type: 'string', maxlength: 50, nullable: true},
        description: {type: 'string', maxlength: 191, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    },
    actions: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        resource_id: {type: 'string', maxlength: 24, nullable: true},
        resource_type: {type: 'string', maxlength: 50, nullable: false},
        actor_id: {type: 'string', maxlength: 24, nullable: false},
        actor_type: {type: 'string', maxlength: 50, nullable: false},
        // @NOTE: The event column contains short buzzwords e.g. subscribed, started, added, deleted, edited etc.
        //        We already store and require the target resource type. No need to remember e.g. post.edited
        event: {type: 'string', maxlength: 50, nullable: false},
        // @NOTE: The context object can be used to store information about an action e.g. diffs, meta
        context: {type: 'text', maxlength: 1000000000, nullable: true},
        created_at: {type: 'dateTime', nullable: false}
    },
    emails: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        post_id: {type: 'string', maxlength: 24, nullable: false, index: true, unique: true},
        uuid: {type: 'string', maxlength: 36, nullable: false, validations: {isUUID: true}},
        status: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'pending',
            validations: {isIn: [['pending', 'submitting', 'submitted', 'failed']]}
        },
        recipient_filter: {
            type: 'text',
            maxlength: 1000000000,
            nullable: false
        },
        error: {type: 'string', maxlength: 2000, nullable: true},
        error_data: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        email_count: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
        delivered_count: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
        opened_count: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
        failed_count: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
        subject: {type: 'string', maxlength: 300, nullable: true},
        from: {type: 'string', maxlength: 2000, nullable: true},
        reply_to: {type: 'string', maxlength: 2000, nullable: true},
        html: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        plaintext: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        source: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        source_type: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'html',
            validations: {isIn: [['html', 'lexical', 'mobiledoc']]}
        },
        track_opens: {type: 'boolean', nullable: false, defaultTo: false},
        track_clicks: {type: 'boolean', nullable: false, defaultTo: false},
        feedback_enabled: {type: 'boolean', nullable: false, defaultTo: false},
        submitted_at: {type: 'dateTime', nullable: false},
        newsletter_id: {type: 'string', maxlength: 24, nullable: true, references: 'newsletters.id'},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    email_batches: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        email_id: {type: 'string', maxlength: 24, nullable: false, references: 'emails.id'},
        provider_id: {type: 'string', maxlength: 255, nullable: true},
        status: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'pending',
            validations: {isIn: [['pending', 'submitting', 'submitted', 'failed']]}
        },
        member_segment: {type: 'text', maxlength: 2000, nullable: true},
        error_status_code: {type: 'integer', nullable: true, unsigned: true},
        error_message: {type: 'string', maxlength: 2000, nullable: true},
        error_data: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: false}
    },
    email_recipients: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        email_id: {type: 'string', maxlength: 24, nullable: false, references: 'emails.id'},
        member_id: {type: 'string', maxlength: 24, nullable: false, index: true},
        batch_id: {type: 'string', maxlength: 24, nullable: false, references: 'email_batches.id'},
        processed_at: {type: 'dateTime', nullable: true},
        delivered_at: {type: 'dateTime', nullable: true},
        opened_at: {type: 'dateTime', nullable: true},
        failed_at: {type: 'dateTime', nullable: true},
        member_uuid: {type: 'string', maxlength: 36, nullable: false},
        member_email: {type: 'string', maxlength: 191, nullable: false},
        member_name: {type: 'string', maxlength: 191, nullable: true},
        '@@INDEXES@@': [
            ['email_id', 'member_email'],
            ['email_id', 'delivered_at'],
            ['email_id', 'opened_at'],
            ['email_id', 'failed_at']
        ]
    },
    email_recipient_failures: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        email_id: {type: 'string', maxlength: 24, nullable: false, references: 'emails.id'},
        member_id: {type: 'string', maxlength: 24, nullable: true},
        email_recipient_id: {type: 'string', maxlength: 24, nullable: false, references: 'email_recipients.id'},
        code: {type: 'integer', nullable: false, unsigned: true},
        enhanced_code: {type: 'string', maxlength: 50, nullable: true},
        message: {type: 'string', maxlength: 2000, nullable: false},
        severity: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'permanent',
            validations: {isIn: [['temporary', 'permanent']]}
        },
        failed_at: {type: 'dateTime', nullable: false},
        event_id: {type: 'string', maxlength: 255, nullable: true}
    },
    tokens: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        token: {type: 'string', maxlength: 32, nullable: false, index: true},
        data: {type: 'string', maxlength: 2000, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        first_used_at: {type: 'dateTime', nullable: true},
        used_count: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
        created_by: {type: 'string', maxlength: 24, nullable: false}
    },
    snippets: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 191, nullable: false, unique: true},
        mobiledoc: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: false},
        lexical: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    custom_theme_settings: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        theme: {type: 'string', maxlength: 191, nullable: false},
        key: {type: 'string', maxlength: 191, nullable: false},
        type: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            validations: {
                isIn: [[
                    'select',
                    'boolean',
                    'color',
                    'text',
                    'image'
                ]]
            }
        },
        value: {type: 'text', maxlength: 65535, nullable: true}
    },
    members_newsletters: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        newsletter_id: {type: 'string', maxlength: 24, nullable: false, references: 'newsletters.id', cascadeDelete: true},
        '@@INDEXES@@': [
            ['newsletter_id', 'member_id']
        ]
    },
    comments: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        post_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'posts.id', cascadeDelete: true},
        member_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'members.id', setNullDelete: true},
        parent_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'comments.id', cascadeDelete: true},
        in_reply_to_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'comments.id', setNullDelete: true},
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'published', validations: {isIn: [['published', 'hidden', 'deleted']]}},
        html: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        edited_at: {type: 'dateTime', nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: false}
    },
    comment_likes: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        comment_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'comments.id', cascadeDelete: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'members.id', cascadeDelete: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: false}
    },
    comment_reports: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        comment_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'comments.id', cascadeDelete: true},
        member_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'members.id', setNullDelete: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: false}
    },
    jobs: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 191, nullable: false, unique: true},
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'queued', validations: {isIn: [['started', 'finished', 'failed', 'queued']]}},
        started_at: {type: 'dateTime', nullable: true},
        finished_at: {type: 'dateTime', nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        metadata: {type: 'string', maxlength: 2000, nullable: true},
        queue_entry: {type: 'integer', nullable: true, unsigned: true}
    },
    redirects: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        from: {type: 'string', maxlength: 191, nullable: false, index: true},
        to: {type: 'string', maxlength: 2000, nullable: false},
        post_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'posts.id', setNullDelete: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    },
    members_click_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        redirect_id: {type: 'string', maxlength: 24, nullable: false, references: 'redirects.id', cascadeDelete: true},
        created_at: {type: 'dateTime', nullable: false}
    },
    members_feedback: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        score: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id', cascadeDelete: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    },
    suppressions: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        email: {type: 'string', maxlength: 191, nullable: false, unique: true, validations: {isEmail: true}},
        email_id: {type: 'string', maxlength: 24, nullable: true, references: 'emails.id'},
        reason: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            validations: {
                isIn: [[
                    'spam',
                    'bounce'
                ]]
            }
        },
        created_at: {type: 'dateTime', nullable: false}
    },
    email_spam_complaint_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        email_id: {type: 'string', maxlength: 24, nullable: false, references: 'emails.id'},
        email_address: {type: 'string', maxlength: 191, nullable: false, unique: false, validations: {isEmail: true}},
        created_at: {type: 'dateTime', nullable: false},
        '@@UNIQUE_CONSTRAINTS@@': [
            ['email_id', 'member_id']
        ]
    },
    mentions: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        source: {type: 'string', maxlength: 2000, nullable: false},
        source_title: {type: 'string', maxlength: 2000, nullable: true},
        source_site_title: {type: 'string', maxlength: 2000, nullable: true},
        source_excerpt: {type: 'string', maxlength: 2000, nullable: true},
        source_author: {type: 'string', maxlength: 2000, nullable: true},
        source_featured_image: {type: 'string', maxlength: 2000, nullable: true},
        source_favicon: {type: 'string', maxlength: 2000, nullable: true},
        target: {type: 'string', maxlength: 2000, nullable: false},
        resource_id: {type: 'string', maxlength: 24, nullable: true},
        resource_type: {type: 'string', maxlength: 50, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        payload: {type: 'text', maxlength: 65535, nullable: true},
        deleted: {type: 'boolean', nullable: false, defaultTo: false},
        verified: {type: 'boolean', nullable: false, defaultTo: false}
    },
    milestones: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        type: {type: 'string', maxlength: 24, nullable: false},
        value: {type: 'integer', nullable: false},
        currency: {type: 'string', maxlength: 24, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        email_sent_at: {type: 'dateTime', nullable: true}
    },
    temp_mail_events: {
        id: {type: 'string', maxlength: 100, nullable: false, primary: true},
        type: {type: 'string', maxlength: 50, nullable: false},
        message_id: {type: 'string', maxlength: 150, nullable: false},
        recipient: {type: 'string', maxlength: 191, nullable: false},
        occurred_at: {type: 'dateTime', nullable: false}
    },
    collections: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        title: {type: 'string', maxlength: 191, nullable: false},
        slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
        description: {type: 'string', maxlength: 2000, nullable: true},
        type: {type: 'string', maxlength: 50, nullable: false},
        filter: {type: 'text', maxlength: 1000000000, nullable: true},
        feature_image: {type: 'string', maxlength: 2000, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    },
    collections_posts: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        collection_id: {type: 'string', maxlength: 24, nullable: false, references: 'collections.id', cascadeDelete: true},
        post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id', cascadeDelete: true},
        sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}
    },
    recommendations: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        url: {type: 'string', maxlength: 2000, nullable: false},
        title: {type: 'string', maxlength: 2000, nullable: false},
        excerpt: {type: 'string', maxlength: 2000, nullable: true},
        featured_image: {type: 'string', maxlength: 2000, nullable: true},
        favicon: {type: 'string', maxlength: 2000, nullable: true},
        description: {type: 'string', maxlength: 2000, nullable: true},
        one_click_subscribe: {type: 'boolean', nullable: false, defaultTo: false},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    },
    recommendation_click_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        recommendation_id: {type: 'string', maxlength: 24, nullable: false, references: 'recommendations.id', unique: false, cascadeDelete: true},
        member_id: {type: 'string', maxlength: 24, nullable: true, references: 'members.id', unique: false, setNullDelete: true},
        created_at: {type: 'dateTime', nullable: false}
    },
    recommendation_subscribe_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        recommendation_id: {type: 'string', maxlength: 24, nullable: false, references: 'recommendations.id', unique: false, cascadeDelete: true},
        member_id: {type: 'string', maxlength: 24, nullable: true, references: 'members.id', unique: false, setNullDelete: true},
        created_at: {type: 'dateTime', nullable: false}
    }
};
