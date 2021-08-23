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
        slug: {type: 'string', maxlength: 191, nullable: false},
        mobiledoc: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        html: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        comment_id: {type: 'string', maxlength: 50, nullable: true},
        plaintext: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
        feature_image: {type: 'string', maxlength: 2000, nullable: true},
        featured: {type: 'bool', nullable: false, defaultTo: false},
        type: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'post', validations: {isIn: [['post', 'page']]}},
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'draft'},
        // NOTE: unused at the moment and reserved for future features
        locale: {type: 'string', maxlength: 6, nullable: true},
        visibility: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'public'
        },
        email_recipient_filter: {
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'none'
        },
        /**
         * @deprecated: single authors was superceded by multiple authors in Ghost 1.22.0
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
        canonical_url: {type: 'text', maxlength: 2000, nullable: true},
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
        feature_image_alt: {type: 'string', maxlength: 191, nullable: true, validations: {isLength: {max: 125}}},
        feature_image_caption: {type: 'text', maxlength: 65535, nullable: true},
        email_only: {type: 'bool', nullable: false, defaultTo: false}
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
        // TODO: would be good to add validation here to control for all possible status values.
        //       The ones that come up by reviewing the user model are:
        //       'active', 'inactive', 'locked', 'warn-1', 'warn-2', 'warn-3', 'warn-4'
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'active'},
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
        last_seen: {type: 'dateTime', nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        created_by: {type: 'string', maxlength: 24, nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        updated_by: {type: 'string', maxlength: 24, nullable: true}
    },
    oauth: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        provider: {type: 'string', maxlength: 50, nullable: false},
        provider_id: {type: 'string', maxlength: 191, nullable: false},
        access_token: {type: 'text', maxlength: 65535, nullable: true},
        refresh_token: {type: 'text', maxlength: 2000, nullable: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true},
        user_id: {type: 'string', maxlength: 24, nullable: false, references: 'users.id'}
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
        sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}
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
    webhooks: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        event: {type: 'string', maxlength: 50, nullable: false, validations: {isLowercase: true}},
        target_url: {type: 'string', maxlength: 2000, nullable: false},
        name: {type: 'string', maxlength: 191, nullable: true},
        secret: {type: 'string', maxlength: 191, nullable: true},
        // NOTE: the defaultTo does not make sense to set on DB layer as it leads to unnecessary maintenance every major release
        //       it might make sense to introduce "isIn" validation checking if it's a valid version e.g: 'v3', 'v4', 'canary'
        api_version: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'v2'},
        // NOTE: integration_id column needs "nullable: true" -> "nullable: false" migration (recreate table with nullable: false)
        // CASE: Ghost instances initialized pre 4.0 will have this column set to nullable: true in db schema
        integration_id: {type: 'string', maxlength: 24, nullable: false, references: 'integrations.id', cascadeDelete: true},
        status: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'available'},
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
    members: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        uuid: {type: 'string', maxlength: 36, nullable: true, unique: true, validations: {isUUID: true}},
        email: {type: 'string', maxlength: 191, nullable: false, unique: true, validations: {isEmail: true}},
        status: {
            type: 'string', maxlength: 50, nullable: false, defaultTo: 'free', validations: {
                isIn: [['free', 'paid', 'comped']]
            }
        },
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
    products: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        name: {type: 'string', maxlength: 191, nullable: false},
        slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
        monthly_price_id: {type: 'string', maxlength: 24, nullable: true},
        yearly_price_id: {type: 'string', maxlength: 24, nullable: true},
        description: {type: 'string', maxlength: 191, nullable: true},
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
        sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}
    },
    members_payment_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        amount: {type: 'integer', nullable: false},
        currency: {type: 'string', maxLength: 3, nullable: false},
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
        member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
        from_plan: {type: 'string', maxlength: 255, nullable: true},
        to_plan: {type: 'string', maxlength: 255, nullable: true},
        currency: {type: 'string', maxLength: 3, nullable: false},
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
    members_stripe_customers_subscriptions: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        customer_id: {type: 'string', maxlength: 255, nullable: false, unique: false, references: 'members_stripe_customers.customer_id', cascadeDelete: true},
        subscription_id: {type: 'string', maxlength: 255, nullable: false, unique: true},
        stripe_price_id: {type: 'string', maxlength: 255, nullable: false, unique: false, index: true, defaultTo: ''},
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
        /* Below fields are now redundant as we link prie_id to stripe_prices table */
        plan_id: {type: 'string', maxlength: 255, nullable: false, unique: false},
        plan_nickname: {type: 'string', maxlength: 50, nullable: false},
        plan_interval: {type: 'string', maxlength: 50, nullable: false},
        plan_amount: {type: 'integer', nullable: false},
        plan_currency: {type: 'string', maxLength: 3, nullable: false}
    },
    members_subscribe_events: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        member_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'members.id', cascadeDelete: true},
        subscribed: {type: 'bool', nullable: false, defaultTo: true},
        created_at: {type: 'dateTime', nullable: false},
        source: {type: 'string', maxlength: 50, nullable: true}
    },
    stripe_products: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        product_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'products.id'},
        stripe_product_id: {type: 'string', maxlength: 255, nullable: false, unique: true},
        created_at: {type: 'dateTime', nullable: false},
        updated_at: {type: 'dateTime', nullable: true}
    },
    stripe_prices: {
        id: {type: 'string', maxlength: 24, nullable: false, primary: true},
        stripe_price_id: {type: 'string', maxlength: 255, nullable: false, unique: true},
        stripe_product_id: {type: 'string', maxlength: 255, nullable: false, unique: false, references: 'stripe_products.stripe_product_id'},
        active: {type: 'bool', nullable: false},
        nickname: {type: 'string', maxlength: 50, nullable: true},
        currency: {type: 'string', maxLength: 3, nullable: false},
        amount: {type: 'integer', nullable: false},
        type: {type: 'string', maxlength: 50, nullable: false, defaultTo: 'recurring', validations: {isIn: [['recurring', 'one_time']]}},
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
            type: 'string',
            maxlength: 50,
            nullable: false,
            defaultTo: 'status:-free'
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
        member_segment: {type: 'text', maxlength: 2000, nullable: true},
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
