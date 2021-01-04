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
    posts: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        uuid: {type: 'string', maxlength: 36, nullable: false, validations: {isUUID: true}},
        title: {type: 'string', maxlength: 2000, nullable: false, validations: {isLength: {max: 255}}},
        slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
        mobiledoc: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        html: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        comment_id: {type: 'string', maxlength: 50, nullable: true},
        plaintext: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        feature_image: {type: 'string', maxlength: 2000, nullable: true},
        featured: {type: 'bool', nullable: false, defaultTo: false},
        type: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'post', validations: {isIn: [['post', 'page']]}},
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'draft'},
        locale: {type: 'string', maxlength: 6, nullable: true},
        visibility: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'public',
            validations: {isIn: [['public', 'members', 'paid']]}
        },
        email_recipient_filter: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'none',
            validations: {isIn: [['none', 'all', 'free', 'paid']]}
        },
        /**
         * @deprecated: `author_id`, might be removed in Ghost 3.0
         * If we keep it, then only, because you can easier query post.author_id than posts_authors[*].sort_order.
         */
        author_id: {type: 'string', maxlength: 24, nullable: false},
        created_at: {type: 'dateTime', nullable: false},
        /**
         * @deprecated: https://github.com/TryGhost/Ghost/issues/10286
         *
         * This is valid for all x_by fields.
         */
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true},
        published_at: {type: 'dateTime', nullable: true},
        published_by: {type: 'string', maxlength: 24, nullable: true},
        custom_excerpt: {type: 'string', maxlength: 2000, nullable: true, validations: {isLength: {max: 300}}},
        codeinjection_head: {type: 'text', maxlength: 65535, nullable: true},
        codeinjection_foot: {type: 'text', maxlength: 65535, nullable: true},
        custom_template: {type: 'string', maxlength: 100, nullable: true},
        canonical_url: {type: 'text', maxlength: 2000, nullable: true}
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
        email_subject: {type: 'string', maxlength: 300, nullable: true}
    },
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
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'active'},
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
        last_seen: {type: 'dateTime', nullable: true},
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
    permissions_apps: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        app_id: {type: 'string', maxlength: 24, nullable: false},
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
                    // TODO: `object` type needs to be removed once all existing object settings are removed
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
        sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}
    },
    apps: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 191, nullable: false, unique: true},
        slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
        version: {type: 'string', maxlength: 50, nullable: false},
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'inactive'},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    app_settings: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        key: {type: 'string', maxlength: 50, nullable: false, unique: true},
        value: {type: 'text', maxlength: 65535, nullable: true},
        app_id: {type: 'string', maxlength: 24, nullable: false, references: 'apps.id'},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    app_fields: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        key: {type: 'string', maxlength: 50, nullable: false},
        value: {type: 'text', maxlength: 65535, nullable: true},
        type: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'html'},
        app_id: {type: 'string', maxlength: 24, nullable: false, references: 'apps.id'},
        relatable_id: {type: 'string', maxlength: 24, nullable: false},
        relatable_type: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'posts'},
        active: {type: 'bool', nullable: false, defaultTo: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
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
        key: {type: 'string', maxlength: 191},
        firstRequest: {type: 'bigInteger'},
        lastRequest: {type: 'bigInteger'},
        lifetime: {type: 'bigInteger'},
        count: {type: 'integer'}
    },
    webhooks: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        event: {type: 'string', maxlength: 50, nullable: false, validations: {isLowercase: true}},
        target_url: {type: 'string', maxlength: 2000, nullable: false},
        name: {type: 'string', maxlength: 191, nullable: true},
        secret: {type: 'string', maxlength: 191, nullable: true},
        api_version: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'v2'},
        integration_id: {type: 'string', maxlength: 24, nullable: true},
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'available'},
        last_triggered_at: {type: 'dateTime', nullable: true},
        last_triggered_status: {type: 'string', maxlength: 50, nullable: true},
        last_triggered_error: {type: 'string', maxlength: 50, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
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
            validations: {isIn: [['internal', 'builtin', 'custom']]}
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
    members: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        uuid: {type: 'string', maxlength: 36, nullable: true, unique: true, validations: {isUUID: true}},
        email: {type: 'string', maxlength: 191, nullable: false, unique: true, validations: {isEmail: true}},
        name: {type: 'string', maxlength: 191, nullable: true},
        note: {type: 'string', maxlength: 2000, nullable: true},
        geolocation: {type: 'string', maxlength: 2000, nullable: true},
        subscribed: {type: 'bool', nullable: true, defaultTo: true},
        email_count: {type: 'integer', unsigned: true, nullable: false, defaultTo: 0},
        email_opened_count: {type: 'integer', unsigned: true, nullable: false, defaultTo: 0},
        email_open_rate: {type: 'integer', unsigned: true, nullable: true, index: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
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
    members_stripe_customers_subscriptions: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        customer_id: {type: 'string', maxlength: 255, nullable: false, unique: false, references: 'members_stripe_customers.customer_id', cascadeDelete: true},
        subscription_id: {type: 'string', maxlength: 255, nullable: false, unique: true},
        plan_id: {type: 'string', maxlength: 255, nullable: false, unique: false},
        status: {type: 'string', maxlength: 50, nullable: false},
        cancel_at_period_end: {type: 'bool', nullable: false, defaultTo: false},
        cancellation_reason: {type: 'string', maxlength: 500, nullable: true},
        current_period_end: {type: 'dateTime', nullable: false},
        start_date: {type: 'dateTime', nullable: false},
        default_payment_card_last4: {type: 'string', maxlength: 4, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true},
        /* Below fields eventually should be normalised e.g. stripe_plans table, link to here on plan_id */
        plan_nickname: {type: 'string', maxlength: 50, nullable: false},
        plan_interval: {type: 'string', maxlength: 50, nullable: false},
        plan_amount: {type: 'integer', nullable: false},
        plan_currency: {type: 'string', maxLength: 3, nullable: false}
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
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'paid',
            validations: {isIn: [['all', 'free', 'paid']]}
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
        track_opens: {type: 'bool', nullable: false, defaultTo: false},
        submitted_at: {type: 'dateTime', nullable: false},
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
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: false}
    },
    email_recipients: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        email_id: {type: 'string', maxlength: 24, nullable: false, references: 'emails.id'},
        member_id: {type: 'string', maxlength: 24, nullable: false, index: true},
        batch_id: {type: 'string', maxlength: 24, nullable: false, references: 'email_batches.id'},
        processed_at: {type: 'dateTime', nullable: true},
        delivered_at: {type: 'dateTime', nullable: true, index: true},
        opened_at: {type: 'dateTime', nullable: true, index: true},
        failed_at: {type: 'dateTime', nullable: true, index: true},
        member_uuid: {type: 'string', maxlength: 36, nullable: false},
        member_email: {type: 'string', maxlength: 191, nullable: false},
        member_name: {type: 'string', maxlength: 191, nullable: true},
        '@@INDEXES@@': [
            ['email_id', 'member_email']
        ]
    },
    tokens: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        token: {type: 'string', maxlength: 32, nullable: false, index: true},
        data: {type: 'string', maxlength: 2000, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false}
    },
    snippets: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 191, nullable: false, unique: true},
        mobiledoc: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: false},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    }
};
