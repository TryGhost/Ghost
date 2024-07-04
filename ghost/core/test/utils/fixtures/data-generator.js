const _ = require('lodash');
const uuid = require('uuid');
const ObjectId = require('bson-objectid').default;
const moment = require('moment');
const constants = require('@tryghost/constants');
const DataGenerator = {};

DataGenerator.markdownToMobiledoc = function markdownToMobiledoc(content) {
    const mobiledoc = {
        version: '0.3.1',
        markups: [],
        atoms: [],
        cards: [
            ['markdown', {
                markdown: content || ''
            }]
        ],
        sections: [[10, 0]]
    };

    return JSON.stringify(mobiledoc);
};

DataGenerator.Content = {
    posts: [
        {
            id: '618ba1ffbe2896088840a6df',
            title: 'HTML Ipsum',
            slug: 'html-ipsum',
            mobiledoc: DataGenerator.markdownToMobiledoc('<h1>HTML Ipsum Presents</h1><p><strong>Pellentesque habitant morbi tristique</strong> senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. <em>Aenean ultricies mi vitae est.</em> Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, <code>commodo vitae</code>, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui. <a href="#">Donec non enim</a> in turpis pulvinar facilisis. Ut felis.</p><h2>Header Level 2</h2><ol><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ol><blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus magna. Cras in mi at felis aliquet congue. Ut a est eget ligula molestie gravida. Curabitur massa. Donec eleifend, libero at sagittis mollis, tellus est malesuada tellus, at luctus turpis elit sit amet quam. Vivamus pretium ornare est.</p></blockquote><h3>Header Level 3</h3><ul><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ul><pre><code>#header h1 a{display: block;width: 300px;height: 80px;}</code></pre>'),
            published_at: new Date('2015-01-01'),
            custom_excerpt: 'This is my custom excerpt!',
            feature_image: 'https://example.com/super_photo.jpg'
        },
        {
            id: '618ba1ffbe2896088840a6e1',
            title: 'Ghostly Kitchen Sink',
            slug: 'ghostly-kitchen-sink',
            mobiledoc: DataGenerator.markdownToMobiledoc('<h1>HTML Ipsum Presents</h1><img src="__GHOST_URL__/content/images/lol.jpg"><p><strong>Pellentesque habitant morbi tristique</strong> senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. <em>Aenean ultricies mi vitae est.</em> Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, <code>commodo vitae</code>, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui. <a href="#">Donec non enim</a> in turpis pulvinar facilisis. Ut felis.</p><h2>Header Level 2</h2><ol><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ol><blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus magna. Cras in mi at felis aliquet congue. Ut a est eget ligula molestie gravida. Curabitur massa. Donec eleifend, libero at sagittis mollis, tellus est malesuada tellus, at luctus turpis elit sit amet quam. Vivamus pretium ornare est.</p></blockquote><h3>Header Level 3</h3><ul><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ul><pre><code>#header h1 a{display: block;width: 300px;height: 80px;}</code></pre>'),
            published_at: new Date('2015-01-02'),
            feature_image: '__GHOST_URL__/content/images/2018/hey.jpg'
        },
        {
            id: '618ba1ffbe2896088840a6e3',
            title: 'Short and Sweet',
            slug: 'short-and-sweet',
            mobiledoc: DataGenerator.markdownToMobiledoc('## testing\n\nmctesters\n\n- test\n- line\n- items'),
            html: '<!--kg-card-begin: markdown--><h2 id=\"testing\">testing</h2>\n<p>mctesters</p>\n<ul>\n<li>test</li>\n<li>line</li>\n<li>items</li>\n</ul>\n<!--kg-card-end: markdown-->',
            plaintext: 'testing\nmctesters\n\n * test\n * line\n * items',
            feature_image: 'http://placekitten.com/500/200',
            published_at: new Date('2015-01-03'),
            featured: true,
            uuid: '2ac6b4f6-e1f3-406c-9247-c94a0496d39d'
        },
        {
            id: '618ba1ffbe2896088840a6e5',
            title: 'Not finished yet',
            slug: 'unfinished',
            mobiledoc: DataGenerator.markdownToMobiledoc('<h1>HTML Ipsum Presents</h1><p><strong>Pellentesque habitant morbi tristique</strong> senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. <em>Aenean ultricies mi vitae est.</em> Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, <code>commodo vitae</code>, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui. <a href="#">Donec non enim</a> in turpis pulvinar facilisis. Ut felis.</p><h2>Header Level 2</h2><ol><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ol><blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus magna. Cras in mi at felis aliquet congue. Ut a est eget ligula molestie gravida. Curabitur massa. Donec eleifend, libero at sagittis mollis, tellus est malesuada tellus, at luctus turpis elit sit amet quam. Vivamus pretium ornare est.</p></blockquote><h3>Header Level 3</h3><ul><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ul><pre><code>#header h1 a{display: block;width: 300px;height: 80px;}</code></pre>'),
            status: 'draft',
            uuid: 'd52c42ae-2755-455c-80ec-70b2ec55c903'
        },
        {
            id: '618ba1ffbe2896088840a6e7',
            title: 'Not so short, bit complex',
            slug: 'not-so-short-bit-complex',
            // NOTE: this has some invalid HTML, has a missing `</p>` after `</nav>`
            mobiledoc: DataGenerator.markdownToMobiledoc('<p><nav><ul><li><a href=\"#nowhere\" title=\"Anchor URL\">Lorem</a></li><li><a href=\"__GHOST_URL__/about#nowhere\" title=\"Relative URL\">Aliquam</a></li><li><a href=\"//somewhere.com/link#nowhere\" title=\"Protocol Relative URL\">Tortor</a></li><li><a href=\"http://somewhere.com/link#nowhere\" title=\"Absolute URL\">Morbi</a></li><li><a href=\"#nowhere\" title=\"Praesent dapibus, neque id cursus faucibus\">Praesent</a></li><li><a href=\"#nowhere\" title=\"Pellentesque fermentum dolor\">Pellentesque</a></li></ul></nav><p>Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo.</p><table><thead><tr><th>1</th><th>2</th><th>3</th><th>4</th></tr></thead><tbody><tr><td>a</td><td>b</td><td>c</td><td>d</td></tr><tr><td>e</td><td>f</td><td>g</td><td>h</td></tr><tr><td>i</td><td>j</td><td>k</td><td>l</td></tr></tbody></table><dl><dt>Definition list</dt><dd>Consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</dd><dt>Lorem ipsum dolor sit amet</dt><dd>Consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</dd></dl><ul><li>Morbi in sem quis dui placerat ornare. Pellentesque odio nisi, euismod in, pharetra a, ultricies in, diam. Sed arcu. Cras consequat.</li><li>Praesent dapibus, neque id cursus faucibus, tortor neque egestas augue, eu vulputate magna eros eu erat. Aliquam erat volutpat. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus, metus.</li><li>Phasellus ultrices nulla quis nibh. Quisque a lectus. Donec consectetuer ligula vulputate sem tristique cursus. Nam nulla quam, gravida non, commodo a, sodales sit amet, nisi.</li><li>Pellentesque fermentum dolor. Aliquam quam lectus, facilisis auctor, ultrices ut, elementum vulputate, nunc.</li></ul></p>'),
            published_at: new Date('2015-01-04'),
            featured: true
        },
        {
            id: '618ba1ffbe2896088840a6e9',
            title: 'This is a static page',
            slug: 'static-page-test',
            mobiledoc: DataGenerator.markdownToMobiledoc('<h1>Static page test is what this is for.</h1><p>Hopefully you don\'t find it a bore.</p>'),
            type: 'page'
        },
        {
            id: '618ba1ffbe2896088840a6eb',
            title: 'This is a draft static page',
            slug: 'static-page-draft',
            mobiledoc: DataGenerator.markdownToMobiledoc('<h1>Static page test is what this is for.</h1><p>Hopefully you don\'t find it a bore.</p>'),
            type: 'page',
            status: 'draft',
            uuid: 'd52c42ae-2755-455c-80ec-70b2ec55c904'
        },
        {
            id: '618ba1ffbe2896088840a6ed',
            title: 'This is a scheduled post!!',
            slug: 'scheduled-post',
            mobiledoc: DataGenerator.markdownToMobiledoc('<h1>Welcome to my invisible post!</h1>'),
            status: 'scheduled',
            published_at: moment().add(2, 'days').toDate()
        }
    ],

    tags: [
        {
            id: '618ba1febe2896088840a6db',
            name: 'kitchen sink',
            slug: 'kitchen-sink',
            feature_image: 'https://example.com/super_photo.jpg'
        },
        {
            id: '9451f5fca366002ebd5dbea6',
            name: 'bacon',
            slug: 'bacon'
        },
        {
            id: '618ba1fdbe2896088840a675',
            name: 'chorizo',
            slug: 'chorizo'
        },
        {
            id: '6193c6d5e792de832cd08148',
            name: 'pollo',
            slug: 'pollo'
        },
        {
            id: '6193c6dfe792de832cd08149',
            name: 'injection',
            slug: 'injection'
        }
    ],

    // Password = Sl1m3rson99
    users: [
        {
            // owner (owner is still id 1 because of permissions)
            id: '1',
            name: 'Joe Bloggs',
            slug: 'joe-bloggs',
            email: 'jbloggs@example.com',
            password: 'Sl1m3rson99',
            profile_image: 'https://example.com/super_photo.jpg',
            paid_subscription_canceled_notification: true
        },
        {
            // admin
            id: '6193c65ee792de832cd08130',
            name: 'Smith Wellingsworth',
            slug: 'smith-wellingsworth',
            email: 'swellingsworth@example.com',
            password: 'Sl1m3rson99'
        },
        {
            // editor
            id: '6193c672e792de832cd0813c',
            name: 'Jimothy Bogendath',
            slug: 'jimothy-bogendath',
            email: 'jbOgendAth@example.com',
            password: 'Sl1m3rson99'
        },
        {
            // author
            id: '6193c685e792de832cd08141',
            name: 'Slimer McEctoplasm',
            slug: 'slimer-mcectoplasm',
            email: 'smcectoplasm@example.com',
            password: 'Sl1m3rson99'
        },
        {
            // editor 2
            id: '6193c693e792de832cd08142',
            name: 'Ivan Email',
            slug: 'ivan-email',
            email: 'info1@ghost.org',
            password: 'Sl1m3rson99'
        },
        {
            // author 2
            id: '6193c6a1e792de832cd08143',
            name: 'Author2',
            slug: 'a-2',
            email: 'info2@ghost.org',
            password: 'Sl1m3rson99'
        },
        {
            // admin 2
            id: '6193c6abe792de832cd08144',
            name: 'admin2',
            slug: 'ad-2',
            email: 'info3@ghost.org',
            password: 'Sl1m3rson99'
        },
        {
            // contributor
            id: '6193c6bae792de832cd08146',
            name: 'Contributor',
            slug: 'contributor',
            email: 'contributor@ghost.org',
            password: 'Sl1m3rson99'
        },
        {
            // contributor
            id: '6193c6c5e792de832cd08147',
            name: 'contributor2',
            slug: 'contrib-2',
            email: 'contributor2@ghost.org',
            password: 'Sl1m3rson99'
        }
    ],

    permissions: [
        {
            id: ObjectId().toHexString(),
            name: 'Browse posts',
            action_type: 'browse',
            object_type: 'post'
        },
        {
            id: ObjectId().toHexString(),
            name: 'test',
            action_type: 'edit',
            object_type: 'post'
        },
        {
            id: ObjectId().toHexString(),
            name: 'test',
            action_type: 'edit',
            object_type: 'tag'
        },
        {
            id: ObjectId().toHexString(),
            name: 'test',
            action_type: 'edit',
            object_type: 'user'
        },
        {
            id: ObjectId().toHexString(),
            name: 'test',
            action_type: 'edit',
            object_type: 'page'
        },
        {
            id: ObjectId().toHexString(),
            name: 'test',
            action_type: 'add',
            object_type: 'post'
        },
        {
            id: ObjectId().toHexString(),
            name: 'test',
            action_type: 'add',
            object_type: 'user'
        },
        {
            id: ObjectId().toHexString(),
            name: 'test',
            action_type: 'add',
            object_type: 'page'
        },
        {
            id: ObjectId().toHexString(),
            name: 'test',
            action_type: 'destroy',
            object_type: 'post'
        },
        {
            id: ObjectId().toHexString(),
            name: 'test',
            action_type: 'destroy',
            object_type: 'user'
        }
    ],

    roles: [
        {
            id: ObjectId().toHexString(),
            name: 'Administrator',
            description: 'Administrators'
        },
        {
            id: ObjectId().toHexString(),
            name: 'Editor',
            description: 'Editors'
        },
        {
            id: ObjectId().toHexString(),
            name: 'Author',
            description: 'Authors'
        },
        {
            id: ObjectId().toHexString(),
            name: 'Owner',
            description: 'Blog Owner'
        },
        {
            id: ObjectId().toHexString(),
            name: 'Contributor',
            description: 'Contributors'
        },
        {
            id: ObjectId().toHexString(),
            name: 'Admin Integration',
            description: 'External Apps'
        }
    ],

    members: [
        {
            id: ObjectId().toHexString(),
            email: 'member1@test.com',
            name: 'Mr Egg',
            uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b340',
            status: 'free',
            email_disabled: false
        },
        {
            id: ObjectId().toHexString(),
            email: 'member2@test.com',
            email_open_rate: 50,
            uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b341',
            status: 'free',
            email_disabled: false
        },
        {
            id: ObjectId().toHexString(),
            email: 'paid@test.com',
            name: 'Egon Spengler',
            email_open_rate: 80,
            uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b342',
            status: 'paid',
            email_disabled: false
        },
        {
            id: ObjectId().toHexString(),
            email: 'trialing@test.com',
            name: 'Ray Stantz',
            uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b343',
            status: 'paid',
            email_disabled: false
        },
        {
            id: ObjectId().toHexString(),
            email: 'comped@test.com',
            name: 'Vinz Clortho',
            uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b344',
            status: 'paid',
            email_disabled: false
        },
        {
            id: ObjectId().toHexString(),
            email: 'vip@test.com',
            name: 'Winston Zeddemore',
            uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b345',
            status: 'free',
            email_disabled: false
        },
        {
            id: ObjectId().toHexString(),
            email: 'vip-paid@test.com',
            name: 'Peter Venkman',
            uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b346',
            status: 'paid',
            subscribed: false,
            email_disabled: false
        },
        {
            id: ObjectId().toHexString(),
            email: 'with-product@test.com',
            name: 'Dana Barrett',
            uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b347',
            status: 'paid',
            subscribed: false,
            email_disabled: false
        }
    ],

    newsletters: [
        {
            id: ObjectId().toHexString(),
            name: 'Daily newsletter',
            slug: 'daily-newsletter',
            description: '',
            sender_name: 'Jamie',
            sender_email: 'jamie@example.com',
            sender_reply_to: 'newsletter',
            status: 'active',
            subscribe_on_signup: false,
            title_font_category: 'serif',
            body_font_category: 'serif',
            show_header_icon: true,
            show_header_title: true,
            show_badge: true,
            sort_order: 1,
            header_image: '__GHOST_URL__/content/images/2022/05/test.jpg'
        },
        {
            id: ObjectId().toHexString(),
            name: 'Weekly newsletter',
            slug: 'weekly-newsletter',
            description: '',
            sender_name: 'Jamie',
            sender_email: 'jamie@example.com',
            sender_reply_to: 'newsletter',
            status: 'active',
            subscribe_on_signup: true,
            title_font_category: 'serif',
            body_font_category: 'serif',
            show_header_icon: true,
            show_header_title: true,
            show_badge: true,
            sort_order: 2,
            header_image: '__GHOST_URL__/content/images/2022/05/test.jpg'
        },
        {
            id: ObjectId().toHexString(),
            name: 'Old newsletter',
            slug: 'old-newsletter',
            description: '',
            sender_name: 'Jamie',
            sender_email: 'jamie@example.com',
            sender_reply_to: 'newsletter',
            status: 'archived',
            subscribe_on_signup: true,
            title_font_category: 'serif',
            body_font_category: 'serif',
            show_header_icon: true,
            show_header_title: true,
            show_badge: true,
            sort_order: 2,
            header_image: '__GHOST_URL__/content/images/2022/05/test.jpg'
        }
    ],

    products: [
        {
            // No ID because these are in the core fixtures.json
            slug: 'free',
            // slug is to match the product, the below are updated for the product
            welcome_page_url: '/welcome-free',
            currency: null,
            monthly_price: null,
            yearly_price: null
        },
        {
            // No ID because these are in the core fixtures.json
            slug: 'default-product',
            // slug is to match the product, the below are updated for the product
            welcome_page_url: '/welcome-paid',
            currency: 'usd',
            monthly_price: 500,
            yearly_price: 5000
        }
    ],

    labels: [
        {
            id: ObjectId().toHexString(),
            name: 'Label 1',
            slug: 'label-1'
        },
        {
            id: ObjectId().toHexString(),
            name: 'Label 2',
            slug: 'label-2'
        },
        {
            id: ObjectId().toHexString(),
            name: 'VIP',
            slug: 'vip'
        }
    ],

    members_stripe_customers: [
        {
            id: ObjectId().toHexString(),
            member_id: null, // relation added later
            customer_id: 'cus_HR3tBmNhx4QsZY',
            name: 'Egon Spengler',
            email: 'paid@test.com'
        },
        {
            id: ObjectId().toHexString(),
            member_id: null, // relation added later
            customer_id: 'cus_HR3tBmNhx4QsZZ',
            name: 'Ray Stantz',
            email: 'trialing@test.com'
        },
        {
            id: ObjectId().toHexString(),
            member_id: null, // relation added later
            customer_id: 'cus_HR3tBmNhx4QsZ0',
            name: 'Vinz Clortho',
            email: 'comped@test.com'
        },
        {
            id: ObjectId().toHexString(),
            member_id: null, // relation added later
            customer_id: 'cus_HR3tBmNhx4QsZ1',
            name: 'Peter Venkman',
            email: 'vip-paid@test.com'
        },
        {
            id: ObjectId().toHexString(),
            member_id: null, // relation added later
            customer_id: 'cus_HR3tBmNhx4QsZ2',
            name: 'Dana Barrett',
            email: 'with-product@test.com'
        }
    ],

    members_paid_subscription_events: [
        {
            id: ObjectId().toHexString(),
            type: 'created',
            mrr_delta: 1000,
            currency: 'usd',
            source: 'stripe',
            created_at: null,
            subscription_id: null,
            member_id: null,
            from_plan: null,
            to_plan: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730bb8'
        }, {
            id: ObjectId().toHexString(),
            type: 'created',
            mrr_delta: 0,
            currency: 'usd',
            source: 'stripe',
            created_at: null,
            subscription_id: null,
            member_id: null,
            from_plan: null,
            to_plan: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730bb9'
        }, {
            id: ObjectId().toHexString(),
            type: 'created',
            mrr_delta: 0,
            currency: 'usd',
            source: 'stripe',
            created_at: null,
            subscription_id: null,
            member_id: null,
            from_plan: null,
            to_plan: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730ba0'
        }
    ],
    members_stripe_customers_subscriptions: [
        {
            id: ObjectId().toHexString(),
            customer_id: 'cus_HR3tBmNhx4QsZY',
            subscription_id: 'sub_HR3tLNgGAHsa7b',
            plan_id: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730bb8',
            stripe_price_id: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730bb8',
            status: 'active',
            cancel_at_period_end: false,
            current_period_end: '2020-07-09 19:01:20',
            start_date: '2020-06-09 19:01:20',
            default_payment_card_last4: '4242',
            plan_nickname: 'Monthly',
            plan_interval: 'month',
            plan_amount: '1000',
            plan_currency: 'usd',
            mrr: 1000
        },
        {
            id: ObjectId().toHexString(),
            customer_id: 'cus_HR3tBmNhx4QsZZ',
            subscription_id: 'sub_HR3tLNgGAHsa7c',
            plan_id: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730bb9',
            stripe_price_id: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730bb9',
            status: 'trialing',
            cancel_at_period_end: true,
            current_period_end: '2025-07-09 19:01:20',
            start_date: '2020-06-09 19:01:20',
            default_payment_card_last4: '4242',
            plan_nickname: 'Monthly',
            plan_interval: 'month',
            plan_amount: '1000',
            plan_currency: 'usd',
            mrr: 0
        },
        {
            id: ObjectId().toHexString(),
            customer_id: 'cus_HR3tBmNhx4QsZ0',
            subscription_id: 'sub_HR3tLNgGAHsa7d',
            plan_id: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730ba0',
            stripe_price_id: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730ba0',
            status: 'active',
            cancel_at_period_end: true,
            current_period_end: '2025-07-09 19:01:20',
            start_date: '2020-06-09 19:01:20',
            default_payment_card_last4: '4242',
            plan_nickname: 'Complimentary',
            plan_interval: 'year',
            plan_amount: '0',
            plan_currency: 'usd',
            mrr: 0
        }
    ],
    stripe_prices: [
        {
            id: ObjectId().toHexString(),
            stripe_price_id: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730b12',
            stripe_product_id: '109c85c734fb9992e7bc30a26af66c22f5c94d8dc62e0a33cb797be902c06b2d',
            active: true,
            nickname: 'Monthly',
            currency: 'USD',
            amount: 500,
            type: 'recurring',
            interval: 'month'
        },
        {
            id: ObjectId().toHexString(),
            stripe_price_id: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730bb8',
            stripe_product_id: '109c85c734fb9992e7bc30a26af66c22f5c94d8dc62e0a33cb797be902c06b2d',
            active: true,
            nickname: 'Monthly',
            currency: 'GBP',
            amount: 1200,
            type: 'recurring',
            interval: 'month'
        },
        {
            id: ObjectId().toHexString(),
            stripe_price_id: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730ba0',
            stripe_product_id: '109c85c734fb9992e7bc30a26af66c22f5c94d8dc62e0a33cb797be902c06b2d',
            active: true,
            nickname: 'Yearly',
            currency: 'GBP',
            amount: 12000,
            type: 'recurring',
            interval: 'year'
        },
        {
            id: ObjectId().toHexString(),
            stripe_price_id: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730bb9',
            stripe_product_id: '109c85c734fb9992e7bc30a26af66c22f5c94d8dc62e0a33cb797be902c06b2d',
            active: true,
            nickname: 'Yearly',
            currency: 'GBP',
            amount: 15000,
            type: 'recurring',
            interval: 'year'
        },
        {
            id: ObjectId().toHexString(),
            stripe_price_id: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730b13',
            stripe_product_id: '109c85c734fb9992e7bc30a26af66c22f5c94d8dc62e0a33cb797be902c06b2d',
            active: true,
            nickname: 'Yearly',
            currency: 'USD',
            amount: 5000,
            type: 'recurring',
            interval: 'year'
        }
    ],
    stripe_products: [
        {
            id: ObjectId().toHexString(),
            product_id: '',
            stripe_product_id: '109c85c734fb9992e7bc30a26af66c22f5c94d8dc62e0a33cb797be902c06b2d'
        }
    ],
    webhooks: [
        {
            id: ObjectId().toHexString(),
            event: 'member.added',
            target_url: 'https://example.com/webhooks/subscriber-added'
        },
        {
            id: ObjectId().toHexString(),
            event: 'member.removed',
            target_url: 'https://example.com/webhooks/subscriber-removed'
        }
    ],

    integrations: [
        {
            id: ObjectId().toHexString(),
            name: 'Test Integration',
            slug: 'test-integration'
        },
        {
            id: ObjectId().toHexString(),
            name: 'Test Internal Integration',
            slug: 'test-internal-integration',
            type: 'internal'
        },
        {
            id: ObjectId().toHexString(),
            name: 'Test Builtin Integration',
            slug: 'test-builtin-integration',
            type: 'builtin'
        },
        {
            id: ObjectId().toHexString(),
            name: 'Test Core Integration',
            slug: 'test-core-integration',
            type: 'core'
        }
    ],

    api_keys: [
        {
            id: ObjectId().toHexString(),
            type: 'admin',
            secret: _.repeat('a', 64)
            // integration_id: DataGenerator.Content.integrations[0].id
        },
        {
            id: ObjectId().toHexString(),
            type: 'content',
            secret: _.repeat('c', 26)
            // integration_id: DataGenerator.Content.integrations[0].id
        },
        {
            id: ObjectId().toHexString(),
            type: 'admin',
            secret: _.repeat('b', 64),
            integration_id: undefined // "internal"
        },
        {
            id: ObjectId().toHexString(),
            type: 'admin',
            secret: _.repeat('d', 26),
            integration_id: undefined // "builtin"
        },
        {
            id: ObjectId().toHexString(),
            type: 'admin',
            secret: _.repeat('e', 64),
            integration_id: undefined // "core"
        }
    ],

    emails: [
        {
            id: ObjectId().toHexString(),
            uuid: '6b6afda6-4b5e-4893-bff6-f16859e8349a',
            status: 'submitted',
            email_count: 6, // match the number of email_recipients relations below
            recipient_filter: 'all',
            subject: 'You got mailed!',
            html: '<p>Look! I\'m an email</p>',
            plaintext: 'Waba-daba-dab-da',
            track_opens: false,
            submitted_at: moment().toDate(),
            newsletter_id: null // newsletter[0] relation added later
        },
        {
            id: ObjectId().toHexString(),
            uuid: '365daa11-4bf0-4614-ad43-6346387ffa00',
            status: 'failed',
            error: 'Everything went south',
            email_count: 3, // doesn't match the number of email_recipients relations below, some calculations may be off
            subject: 'You got mailed! Again!',
            html: '<p>What\'s that? Another email!</p>',
            plaintext: 'yes this is an email',
            track_opens: false,
            submitted_at: moment().toDate(),
            newsletter_id: null // newsletter[1] relation added later
        }
    ],

    email_batches: [
        {
            id: ObjectId().toHexString(),
            email_id: null, // emails[0] relation added later
            provider_id: 'email1@testing.mailgun.net',
            status: 'submitted'
        }
    ],

    email_recipients: [
        {
            id: ObjectId().toHexString(),
            email_id: null, // emails[0] relation added later
            member_id: null, // members[0] relation added later
            batch_id: null, // email_batches[0] relation added later
            processed_at: moment().toDate(),
            failed_at: null,
            delivered_at: null,
            member_uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b340',
            member_email: null, // members[1] relation added later
            member_name: 'Mr Egg'
        },
        {
            id: ObjectId().toHexString(),
            email_id: null, // emails[0] relation added later
            member_id: null, // members[1] relation added later
            batch_id: null, // email_batches[0] relation added later
            processed_at: moment().toDate(),
            failed_at: null,
            delivered_at: null,
            member_uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b341',
            member_email: null, // members[2] relation added later
            member_name: null
        },
        {
            id: ObjectId().toHexString(),
            email_id: null, // emails[0] relation added later
            member_id: null, // members[2] relation added later
            batch_id: null, // email_batches[0] relation added later
            processed_at: moment().toDate(),
            failed_at: null,
            delivered_at: null,
            member_uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b342',
            member_email: null, // members[3] relation added later
            member_name: 'Mr Egg'
        },
        {
            id: ObjectId().toHexString(),
            email_id: null, // emails[0] relation added later
            member_id: null, // members[3] relation added later
            batch_id: null, // email_batches[0] relation added later
            processed_at: moment().toDate(),
            failed_at: null,
            delivered_at: null,
            member_uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b343',
            member_email: null, // members[4] relation added later
            member_name: 'Mr Egg'
        },
        {
            id: ObjectId().toHexString(),
            email_id: null, // emails[0] relation added later
            member_id: null, // members[4] relation added later
            batch_id: null, // email_batches[0] relation added later
            processed_at: moment().toDate(),
            delivered_at: moment().toDate(),
            opened_at: moment().toDate(),
            failed_at: null,
            member_uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b344',
            member_email: null, // members[5] relation added later
            member_name: 'Mr Egg'
        },
        {
            id: ObjectId().toHexString(),
            email_id: null, // emails[0] relation added later
            member_id: null, // members[5] relation added later
            batch_id: null, // email_batches[0] relation added later
            processed_at: moment().toDate(),
            delivered_at: null,
            opened_at: null,
            failed_at: moment().toDate(),
            member_uuid: 'f6f91461-d7d8-4a3f-aa5d-8e582c40b344',
            member_email: null, // members[6] relation added later
            member_name: 'Mr Egg'
        }
    ],

    snippets: [
        {
            id: ObjectId().toHexString(),
            name: 'Test snippet 1',
            mobiledoc: '{}'
        }
    ],

    custom_theme_settings: [
        {
            id: ObjectId().toHexString(),
            theme: 'casper',
            key: 'header_typography',
            type: 'select',
            value: 'Serif'
        },
        {
            id: ObjectId().toHexString(),
            theme: 'casper',
            key: 'footer_type',
            type: 'select',
            value: 'Full'
        }
    ],

    comments: [
        {
            id: '6195c6a1e792de832cd08144',
            html: '<p>First.</p>',
            member_index: 0
        },
        {
            id: '6195c6a1e792de832cd08145',
            html: '<p>Really original</p>',
            parent_id: '6195c6a1e792de832cd08144',
            member_index: 1
        }
    ],

    links: [
        {
            id: ObjectId().toHexString(),
            from: '/r/70b0129a',
            to: '__GHOST_URL__/blog/email/01cd4df3-83fa-4921-83be-3bb9a465ef83/?ref=Test-newsletter&attribution_id=6343994e7216ffcbce491716&attribution_type=post',
            created_at: null,
            updated_at: null
        },
        {
            id: ObjectId().toHexString(),
            from: '/r/a0b0129a',
            to: '__GHOST_URL__/blog/email/01cd4df3-83fa-4921-83be-3bb9a465ef83/?ref=Test-newsletter&attribution_id=6343994e7216ffcbce491716&attribution_type=post',
            created_at: null,
            updated_at: null
        },
        {
            id: ObjectId().toHexString(),
            from: '/r/20b0129a',
            to: 'https://example.com/subscripe?ref=Test-newsletter',
            created_at: null,
            updated_at: null
        }
    ],

    // TODO: build mentions for testing browse endpoint
    mentions: [
        // source: webmention.source,
        // target: webmention.target,
        // timestamp: new Date(),
        // payload: webmention.payload,
        // resourceId: resourceInfo.type === 'post' ? resourceInfo.id : null,
        // sourceTitle: metadata.title,
        // sourceSiteTitle: metadata.siteTitle,
        // sourceAuthor: metadata.author,
        // sourceExcerpt: metadata.excerpt,
        // sourceFavicon: metadata.favicon,
        // sourceFeaturedImage: metadata.image
        {
            id: ObjectId().toHexString(),
            source: 'https://source.com',
            target: 'https://target.com',
            sourceTitle: 'Title!',
            sourceExcerpt: 'Excerpt!'
        },
        {
            id: ObjectId().toHexString(),
            source: 'https://anothersource.com',
            target: 'https://anothertarget.com',
            sourceTitle: 'Another Title!',
            sourceExcerpt: 'Another Excerpt!'
        },
        {
            id: ObjectId().toHexString(),
            source: 'https://src.com',
            target: 'https://target.com',
            sourceTitle: 'Title goes here',
            sourceExcerpt: 'Excerpt goes here'
        }
    ]
};

// set up belongs_to relationships
DataGenerator.Content.api_keys[0].integration_id = DataGenerator.Content.integrations[0].id;
DataGenerator.Content.api_keys[1].integration_id = DataGenerator.Content.integrations[0].id;
DataGenerator.Content.api_keys[3].integration_id = DataGenerator.Content.integrations[2].id;
DataGenerator.Content.api_keys[4].integration_id = DataGenerator.Content.integrations[3].id;
DataGenerator.Content.webhooks[0].integration_id = DataGenerator.Content.integrations[0].id;
DataGenerator.Content.webhooks[1].integration_id = DataGenerator.Content.integrations[0].id;
DataGenerator.Content.emails[0].post_id = DataGenerator.Content.posts[0].id;
DataGenerator.Content.emails[1].post_id = DataGenerator.Content.posts[1].id;
DataGenerator.Content.email_batches[0].email_id = DataGenerator.Content.emails[0].id;
DataGenerator.Content.email_recipients[0].batch_id = DataGenerator.Content.email_batches[0].id;
DataGenerator.Content.email_recipients[0].email_id = DataGenerator.Content.email_batches[0].email_id;
DataGenerator.Content.email_recipients[0].member_id = DataGenerator.Content.members[0].id;
DataGenerator.Content.email_recipients[0].member_email = DataGenerator.Content.members[0].email;
DataGenerator.Content.email_recipients[1].batch_id = DataGenerator.Content.email_batches[0].id;
DataGenerator.Content.email_recipients[1].email_id = DataGenerator.Content.email_batches[0].email_id;
DataGenerator.Content.email_recipients[1].member_id = DataGenerator.Content.members[1].id;
DataGenerator.Content.email_recipients[1].member_email = DataGenerator.Content.members[1].email;
DataGenerator.Content.email_recipients[2].batch_id = DataGenerator.Content.email_batches[0].id;
DataGenerator.Content.email_recipients[2].email_id = DataGenerator.Content.email_batches[0].email_id;
DataGenerator.Content.email_recipients[2].member_id = DataGenerator.Content.members[2].id;
DataGenerator.Content.email_recipients[2].member_email = DataGenerator.Content.members[2].email;
DataGenerator.Content.email_recipients[3].batch_id = DataGenerator.Content.email_batches[0].id;
DataGenerator.Content.email_recipients[3].email_id = DataGenerator.Content.email_batches[0].email_id;
DataGenerator.Content.email_recipients[3].member_id = DataGenerator.Content.members[3].id;
DataGenerator.Content.email_recipients[3].member_email = DataGenerator.Content.members[3].email;
DataGenerator.Content.email_recipients[4].batch_id = DataGenerator.Content.email_batches[0].id;
DataGenerator.Content.email_recipients[4].email_id = DataGenerator.Content.email_batches[0].email_id;
DataGenerator.Content.email_recipients[4].member_id = DataGenerator.Content.members[4].id;
DataGenerator.Content.email_recipients[4].member_email = DataGenerator.Content.members[4].email;
DataGenerator.Content.email_recipients[5].batch_id = DataGenerator.Content.email_batches[0].id;
DataGenerator.Content.email_recipients[5].email_id = DataGenerator.Content.email_batches[0].email_id;
DataGenerator.Content.email_recipients[5].member_id = DataGenerator.Content.members[5].id;
DataGenerator.Content.email_recipients[5].member_email = DataGenerator.Content.members[5].email;
DataGenerator.Content.members_stripe_customers[0].member_id = DataGenerator.Content.members[2].id;
DataGenerator.Content.members_stripe_customers[1].member_id = DataGenerator.Content.members[3].id;
DataGenerator.Content.members_stripe_customers[2].member_id = DataGenerator.Content.members[4].id;
DataGenerator.Content.members_stripe_customers[3].member_id = DataGenerator.Content.members[6].id;
DataGenerator.Content.members_stripe_customers[4].member_id = DataGenerator.Content.members[7].id;
DataGenerator.Content.members_paid_subscription_events[0].member_id = DataGenerator.Content.members[2].id;
DataGenerator.Content.members_paid_subscription_events[1].member_id = DataGenerator.Content.members[3].id;
DataGenerator.Content.members_paid_subscription_events[2].member_id = DataGenerator.Content.members[4].id;
DataGenerator.Content.links[0].post_id = DataGenerator.Content.posts[0].id;
DataGenerator.Content.links[1].post_id = DataGenerator.Content.posts[0].id;
DataGenerator.Content.links[2].post_id = DataGenerator.Content.posts[0].id;

DataGenerator.forKnex = (function () {
    function createBasic(overrides) {
        const newObj = _.cloneDeep(overrides);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            created_by: DataGenerator.Content.users[0].id,
            created_at: new Date(),
            updated_by: DataGenerator.Content.users[0].id,
            updated_at: new Date()
        });
    }

    function createTag(overrides) {
        const newObj = _.cloneDeep(overrides);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            name: 'tag',
            slug: 'slug',
            feature_image: null,
            meta_title: null,
            meta_description: null,
            description: 'description',
            visibility: 'public',
            created_by: DataGenerator.Content.users[0].id,
            created_at: new Date(),
            updated_by: DataGenerator.Content.users[0].id,
            updated_at: new Date()
        });
    }

    function createPost(overrides) {
        overrides = overrides || {};

        const newObj = _.cloneDeep(overrides);
        let mobiledocObj;

        if (!newObj.mobiledoc) {
            newObj.mobiledoc = DataGenerator.markdownToMobiledoc('## markdown');
        }

        if (!newObj.html) {
            mobiledocObj = JSON.parse(newObj.mobiledoc);
            newObj.html = mobiledocObj.cards && mobiledocObj.cards[0][1].markdown;
        }

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            uuid: uuid.v4(),
            title: 'title',
            status: 'published',
            feature_image: null,
            featured: false,
            type: 'post',
            slug: 'slug',
            updated_at: new Date(),
            updated_by: DataGenerator.Content.users[0].id,
            created_at: new Date(),
            created_by: DataGenerator.Content.users[0].id,
            published_at: new Date(),
            published_by: DataGenerator.Content.users[0].id,
            visibility: 'public'
        });
    }

    function createGenericPost(uniqueInteger, status, locale, authors) {
        status = status || 'draft';
        locale = locale || null;

        return createPost({
            id: ObjectId().toHexString(),
            title: 'Test Post ' + uniqueInteger,
            slug: 'ghost-from-fiction-to-function-' + uniqueInteger,
            mobiledoc: DataGenerator.markdownToMobiledoc('Three days ago I released a <a title="Ghost" href="http:\/\/john.onolan.org\/ghost\/">concept page<\/a> for a lite version of WordPress that I\'ve been thinking about for a long time, called Ghost. I think it\'s fair to say that I didn\'t quite anticipate how strong the reaction would be - and I\'ve hardly had time to catch my breath in the last 72 hours.\n\nThe response was overwhelming, and overwhelmingly positive. In the first 6 hours my site got 35,000 page views after hitting the number 1 slot on <a href="http:\/\/news.ycombinator.com\/item?id=4743245" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/news.ycombinator.com\']);">Hacker News<\/a>.&nbsp;As of right now, the traffic count is just over <a href="http:\/\/john.onolan.org\/wp-content\/uploads\/2012\/11\/Screen-Shot-2012-11-09-at-17.51.21.png" rel="lightbox" class="cboxElement">91,000 page views<\/a>&nbsp;- and Ghost has been featured all over the place. Notable mentions so far include Christina Warren from Mashable, who <a href="http:\/\/christina.is\/" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/christina.is\']);">wrote about it<\/a>. Michael Carney from PandoDaily <a href="http:\/\/pandodaily.com\/2012\/11\/07\/wordpress-guru-designs-a-concept-blogging-platform-that-doesnt-suck-gets-rave-reviews\/" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/pandodaily.com\']);">interviewed me about it<\/a>. Someone even <a href="http:\/\/www.voicens.com\/web\/?p=4425" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/www.voicens.com\']);">wrote about it in Chinese<\/a>. That\'s pretty cool.\n\n\nThe feedback has been amazing, and while it\'s impossible to reply to all of the messages individually, I\'m getting to as many of them as I can and I want to thank each and every one of you who took the time to send me a message or share the concept because you liked it. Now that the initial storm has died down a bit, I wanted to take some time to answer some of the more common questions and talk about what\'s next.\n<h2>FAQ - Continued...<\/h2>\n\nThe most common question, bizarrely:\n<h5><em><strong>Oh my god, why is that whole page made of images? What\'s wrong with you? \/\/ I can\'t take you seriously \/\/ Don\'t you know anything about the web? \/\/ You are literally Satan re-incarnate.<\/strong><\/em><\/h5>\n\nThis was really the only negativity I got in response to the post, and it surprised me. I put together the concept page as... just that... a concept. It was a way for me to get the ideas out of my head and "down on paper" - or so to speak. I used photoshop as a <em>tool<\/em> to write down my idea with text and images. If I used a sketchbook as a <em>tool&nbsp;<\/em>to create images and handwritten notes, then uploaded scans of it, I doubt anyone would complain. The concept page was never supposed to be a finished product because I had no idea if there would be any interest in it. I had no motivation to waste hours coding a custom layout for something might only ever be read by a few people and then forgotten.\n\nHardware manufacturers make hundreds of foam cutout prototypes of products before they build one with working buttons and screens. I\'m aware of all the usability problems with a web page made of images, and equally, foam cutouts without buttons or screens aren\'t particularly user friendly either. They\'re not supposed to be.\n\nLet\'s move on.\n<h5><em><strong>What? Why no comments? I need comments.<\/strong><\/em><\/h5>\n\nBecause comments add a layer of complexity that is beyond the core focus of this platform, which is publishing. Again, that\'s not to say you couldn\'t have any comments. This could easily be added with a dedicated plugin where you own the data or (as mentioned) there are third party providers such as Disqus, IntenseDebate, Livefyre and Facebook who all have great platforms. The point of this isn\'t to say "you can\'t have comments" - it\'s to say "comments aren\'t on by default". It\'s about simplicity, more than anything else.\n<h5><em><strong>Yeah, but WordPress are already going to revise their dashboard, WordPress.com is experimenting with a potential simplified version... so why bother with this?<\/strong><\/em><\/h5>\n\n<a href="http:\/\/john.onolan.org\/wp-content\/uploads\/2012\/11\/newwp.png" rel="lightbox[2102]" title="newwp" class="cboxElement"><img class="alignnone size-large wp-image-2117" title="newwp" src="http:\/\/john.onolan.org\/wp-content\/uploads\/2012\/11\/newwp-550x210.png" alt="" width="550" height="210"><\/a>\n\nSorry, but Tumblr already did this - it\'s not the future of blogging, it\'s the past.\n\nGhost isn\'t about sharing "Fuck Yeah [<a href="http:\/\/fuckyeahdogs.tumblr.com\/" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/fuckyeahdogs.tumblr.com\']);">Dogs<\/a>\/<a href="http:\/\/fuckyeahsharks.tumblr.com\/" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/fuckyeahsharks.tumblr.com\']);" rel="lightbox" class="cboxElement">Sharks<\/a>\/<a href="http:\/\/fuckyeahgirlswithtattoos.tumblr.com\/" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/fuckyeahgirlswithtattoos.tumblr.com\']);">Girls with Tattoos<\/a>]" - it\'s about publishing - which means writing - rather than mashing a few buttons to make sure that everyone can see and appreciate your latest funny picture\/status, which is surely the most funny picture\/status you\'ve ever posted.\n\nTumblr, Pinterest and Facebook already have this locked down.&nbsp;It\'s not the future.\n<h5><em><strong>So... are you actually going to build this thing?<\/strong><\/em><\/h5>\n\nThe concept page was a way for me to test demand and interest. To see if anyone actually agreed with my frustrations and, more importantly, my solutions. I plucked a random figure of "10,000 pageviews" out of the air before I hit the publish button. If it got less than 10,000 pageviews, I would surrender to the fact that it would only ever be an idea. I\'ve now exceeded that goal 9 times over, so yes, I\'m looking at how Ghost can now be made into a reality.\n<h5><em><strong>How can I find out when it\'s done? \/\/ SHUT UP AND TAKE MY MONEY<\/strong><\/em><\/h5>\n\nOk, ok - there\'s a holding page up on <a href="http:\/\/tryghost.org" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/tryghost.org\']);">http:\/\/TryGhost.org<\/a> - put your email address in.\n<hr>\n<h3>How are you going to do this?<\/h3>\n\nThere\'s three main ways of going about this, each has merits as well as drawbacks.\n\n<em><strong>1.) Build it from scratch<\/strong><\/em> - Many people (particularly the Hacker News crowd) expressed the sentiment that there was little point in forking WordPress. When you\'re going to strip out so much, you get to a point where you might as well start from scratch anyway. Take away the crutches of being stuck with older technologies and put together something which is as sophisticated in code as it is in UI\/UX.\n<ul>\n<li><em>Pros:<\/em> The idea of something completely new is exciting, opportunity to build something very sophisticated, complete control over everything.<\/li>\n<li><em>Cons:<\/em> Lose the &nbsp;WordPress ecosystem which includes millions of users and thousands of developers, potentially spend the next 6 months fighting over whether to use PHP\/RoR\/Django\/Python\/Node\/Whateverthefuck because everyone loves to evangelise the technology they know best.<\/li>\n<\/ul>\n\n<em><strong>2.) Fork WordPress<\/strong><\/em> - This was the original idea I put out. Take the WordPress codebase, as is, and modify it to turn it into something new. Initially the codebase is practically the same, which means developers already know it. Then it can change over time and evolve into its own thing.\n<ul>\n<li><em>Pros:<\/em> Easy start with existing codebase, potential to evolve, doesn\'t lose WordPress ecosystem initially.<\/li>\n<li><em>Cons:<\/em> Stuck with existing codebase - the good as well as the bad, &nbsp;eventually needs to be rewritten completely, less control, loses the WordPress ecosystem after a while anyway, makes it complicated to transition from legacy code to new code.<\/li>\n<\/ul>\n\n<em><strong>3.) Make it a plugin\/extension<\/strong><\/em> - Lots of people asked why Ghost couldn\'t just be a WordPress plugin. It would certainly be the easiest route of the 3, it\'s possible to completely remove \/wp-admin\/ and replace with with \/ghost\/ ... but I feel like it kind of misses the point. This route bolts Ghost on, but it\'s still WordPress under the hood. From a UI\/UX standpoint it would function - but it wouldn\'t revolutionise anything else. It makes WordPress itself about blogging again, rather than creating something new.\n<ul>\n<li><em>Pros:<\/em> Very easy development, very easy deployment, keeps WordPress ecosystem forever, doesn\'t force anyone to change.<\/li>\n<li><em>Cons:<\/em> The least exciting (for me, personally), much less control, it would be much harder to maintain something like this on a non-profit basis - which loses a piece of what Ghost is about.<\/li>\n<\/ul>\n<h3>What\'s the answer?<\/h3>\n\nI\'ve spoken to a lot of smart people over the last few days. The one thing that everyone seems to agree on is that a fork is the worst of both worlds. So the one thing that I suggested as a way of making this happen, is the least likely to work in reality. Remember the foam prototype metaphor earlier? Learning and iterating - that\'s what happening now.\n\nThat leaves a choice between WordPress plugin or fresh build. The answer? Both.\n\nA WordPress plugin will act as a proof of concept and a working prototype, initially, because it\'s easier to leverage the existing WordPress ecosystem to create it than to go into a cave for 6 months trying to build this amazing thing that everyone will have forgotten about.\n\nThe plugin will not be perfect. It will add the Ghost UI\/UX and as much functionality as we can cram into it. It will completely remove \/wp-admin\/ and replace it with \/ghost\/ - effectively using WordPress core as a basic foundation to build on top of. It will give people who don\'t want to switch away from WordPress access to the Ghost UX which they want to have, and it will give people who want the full Ghost platform a taste of what\'s to come.\n\nIt will allow us to develop and learn and iterate on the concept pretty rapidly, which has a great deal of value.\n\nThis is step one. Assuming the plugin is actually used by people - it would then justify exploring building the standalone version of Ghost from the ground up. The plugin would subsequently serve as a great marketing tool for the platform. Think of it as an upgrade path. But that\'s a long way away. Having the idea is the easy part. Making it happen is what counts.\n\nHappily - amongst the thousands of people talking about Ghost for the last few days - several have been talking about how they\'ve already built some working prototypes of my mockups and turned them into WordPress plugins or just local development sites. These will likely go on to be the starting point of the first Ghost plugin.<\/p>\n\nThere\'s a lot to do, and I\'m amazed by the number of people who have offered their help with this. In the next few days I\'ll be kicking off work on the plugin properly and start putting together a more organised structure which explains how you can get involved and contribute to the project if you\'re interested. So... watch this space - and thanks for all your support so far.\n\n<a href="http:\/\/twitter.com\/TryGhost" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/twitter.com\']);" class="twitter-follow-button">Follow @TryGhost<\/a>'),
            html: '<p>Three days ago I released a <a title="Ghost" href="http:\/\/john.onolan.org\/ghost\/">concept page<\/a> for a lite version of WordPress that I\'ve been thinking about for a long time, called Ghost. I think it\'s fair to say that I didn\'t quite anticipate how strong the reaction would be - and I\'ve hardly had time to catch my breath in the last 72 hours.<\/p>\n<p>The response was overwhelming, and overwhelmingly positive. In the first 6 hours my site got 35,000 page views after hitting the number 1 slot on <a href="http:\/\/news.ycombinator.com\/item?id=4743245" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/news.ycombinator.com\']);">Hacker News<\/a>.&nbsp;As of right now, the traffic count is just over <a href="http:\/\/john.onolan.org\/wp-content\/uploads\/2012\/11\/Screen-Shot-2012-11-09-at-17.51.21.png" rel="lightbox" class="cboxElement">91,000 page views<\/a>&nbsp;- and Ghost has been featured all over the place. Notable mentions so far include Christina Warren from Mashable, who <a href="http:\/\/christina.is\/" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/christina.is\']);">wrote about it<\/a>. Michael Carney from PandoDaily <a href="http:\/\/pandodaily.com\/2012\/11\/07\/wordpress-guru-designs-a-concept-blogging-platform-that-doesnt-suck-gets-rave-reviews\/" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/pandodaily.com\']);">interviewed me about it<\/a>. Someone even <a href="http:\/\/www.voicens.com\/web\/?p=4425" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/www.voicens.com\']);">wrote about it in Chinese<\/a>. That\'s pretty cool.\\n<p>The feedback has been amazing, and while it\'s impossible to reply to all of the messages individually, I\'m getting to as many of them as I can and I want to thank each and every one of you who took the time to send me a message or share the concept because you liked it. Now that the initial storm has died down a bit, I wanted to take some time to answer some of the more common questions and talk about what\'s next.<\/p>\n<h2>FAQ - Continued...<\/h2>\n<p>The most common question, bizarrely:<\/p>\n<h5><em><strong>Oh my god, why is that whole page made of images? What\'s wrong with you? \/\/ I can\'t take you seriously \/\/ Don\'t you know anything about the web? \/\/ You are literally Satan re-incarnate.<\/strong><\/em><\/h5>\n<p>This was really the only negativity I got in response to the post, and it surprised me. I put together the concept page as... just that... a concept. It was a way for me to get the ideas out of my head and "down on paper" - or so to speak. I used photoshop as a <em>tool<\/em> to write down my idea with text and images. If I used a sketchbook as a <em>tool&nbsp;<\/em>to create images and handwritten notes, then uploaded scans of it, I doubt anyone would complain. The concept page was never supposed to be a finished product because I had no idea if there would be any interest in it. I had no motivation to waste hours coding a custom layout for something might only ever be read by a few people and then forgotten.<\/p>\n<p>Hardware manufacturers make hundreds of foam cutout prototypes of products before they build one with working buttons and screens. I\'m aware of all the usability problems with a web page made of images, and equally, foam cutouts without buttons or screens aren\'t particularly user friendly either. They\'re not supposed to be.<\/p>\n<p>Let\'s move on.<\/p>\n<h5><em><strong>What? Why no comments? I need comments.<\/strong><\/em><\/h5>\n<p>Because comments add a layer of complexity that is beyond the core focus of this platform, which is publishing. Again, that\'s not to say you couldn\'t have any comments. This could easily be added with a dedicated plugin where you own the data or (as mentioned) there are third party providers such as Disqus, IntenseDebate, Livefyre and Facebook who all have great platforms. The point of this isn\'t to say "you can\'t have comments" - it\'s to say "comments aren\'t on by default". It\'s about simplicity, more than anything else.<\/p>\n<h5><em><strong>Yeah, but WordPress are already going to revise their dashboard, WordPress.com is experimenting with a potential simplified version... so why bother with this?<\/strong><\/em><\/h5>\n<p><a href="http:\/\/john.onolan.org\/wp-content\/uploads\/2012\/11\/newwp.png" rel="lightbox[2102]" title="newwp" class="cboxElement"><img class="alignnone size-large wp-image-2117" title="newwp" src="http:\/\/john.onolan.org\/wp-content\/uploads\/2012\/11\/newwp-550x210.png" alt="" width="550" height="210"><\/a><\/p>\n<p>Sorry, but Tumblr already did this - it\'s not the future of blogging, it\'s the past.<\/p>\n<p>Ghost isn\'t about sharing "Fuck Yeah [<a href="http:\/\/fuckyeahdogs.tumblr.com\/" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/fuckyeahdogs.tumblr.com\']);">Dogs<\/a>\/<a href="http:\/\/fuckyeahsharks.tumblr.com\/" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/fuckyeahsharks.tumblr.com\']);" rel="lightbox" class="cboxElement">Sharks<\/a>\/<a href="http:\/\/fuckyeahgirlswithtattoos.tumblr.com\/" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/fuckyeahgirlswithtattoos.tumblr.com\']);">Girls with Tattoos<\/a>]" - it\'s about publishing - which means writing - rather than mashing a few buttons to make sure that everyone can see and appreciate your latest funny picture\/status, which is surely the most funny picture\/status you\'ve ever posted.<\/p>\n<p>Tumblr, Pinterest and Facebook already have this locked down.&nbsp;It\'s not the future.<\/p>\n<h5><em><strong>So... are you actually going to build this thing?<\/strong><\/em><\/h5>\n<p>The concept page was a way for me to test demand and interest. To see if anyone actually agreed with my frustrations and, more importantly, my solutions. I plucked a random figure of "10,000 pageviews" out of the air before I hit the publish button. If it got less than 10,000 pageviews, I would surrender to the fact that it would only ever be an idea. I\'ve now exceeded that goal 9 times over, so yes, I\'m looking at how Ghost can now be made into a reality.<\/p>\n<h5><em><strong>How can I find out when it\'s done? \/\/ SHUT UP AND TAKE MY MONEY<\/strong><\/em><\/h5>\n<p>Ok, ok - there\'s a holding page up on <a href="http:\/\/tryghost.org" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/tryghost.org\']);">http:\/\/TryGhost.org<\/a> - put your email address in.<\/p>\n<hr>\n<h3>How are you going to do this?<\/h3>\n<p>There\'s three main ways of going about this, each has merits as well as drawbacks.<\/p>\n<p><em><strong>1.) Build it from scratch<\/strong><\/em> - Many people (particularly the Hacker News crowd) expressed the sentiment that there was little point in forking WordPress. When you\'re going to strip out so much, you get to a point where you might as well start from scratch anyway. Take away the crutches of being stuck with older technologies and put together something which is as sophisticated in code as it is in UI\/UX.<\/p>\n<ul>\n<li><em>Pros:<\/em> The idea of something completely new is exciting, opportunity to build something very sophisticated, complete control over everything.<\/li>\n<li><em>Cons:<\/em> Lose the &nbsp;WordPress ecosystem which includes millions of users and thousands of developers, potentially spend the next 6 months fighting over whether to use PHP\/RoR\/Django\/Python\/Node\/Whateverthefuck because everyone loves to evangelise the technology they know best.<\/li>\n<\/ul>\n<p><em><strong>2.) Fork WordPress<\/strong><\/em> - This was the original idea I put out. Take the WordPress codebase, as is, and modify it to turn it into something new. Initially the codebase is practically the same, which means developers already know it. Then it can change over time and evolve into its own thing.<\/p>\n<ul>\n<li><em>Pros:<\/em> Easy start with existing codebase, potential to evolve, doesn\'t lose WordPress ecosystem initially.<\/li>\n<li><em>Cons:<\/em> Stuck with existing codebase - the good as well as the bad, &nbsp;eventually needs to be rewritten completely, less control, loses the WordPress ecosystem after a while anyway, makes it complicated to transition from legacy code to new code.<\/li>\n<\/ul>\n<p><em><strong>3.) Make it a plugin\/extension<\/strong><\/em> - Lots of people asked why Ghost couldn\'t just be a WordPress plugin. It would certainly be the easiest route of the 3, it\'s possible to completely remove \/wp-admin\/ and replace with with \/ghost\/ ... but I feel like it kind of misses the point. This route bolts Ghost on, but it\'s still WordPress under the hood. From a UI\/UX standpoint it would function - but it wouldn\'t revolutionise anything else. It makes WordPress itself about blogging again, rather than creating something new.<\/p>\n<ul>\n<li><em>Pros:<\/em> Very easy development, very easy deployment, keeps WordPress ecosystem forever, doesn\'t force anyone to change.<\/li>\n<li><em>Cons:<\/em> The least exciting (for me, personally), much less control, it would be much harder to maintain something like this on a non-profit basis - which loses a piece of what Ghost is about.<\/li>\n<\/ul>\n<h3>What\'s the answer?<\/h3>\n<p>I\'ve spoken to a lot of smart people over the last few days. The one thing that everyone seems to agree on is that a fork is the worst of both worlds. So the one thing that I suggested as a way of making this happen, is the least likely to work in reality. Remember the foam prototype metaphor earlier? Learning and iterating - that\'s what happening now.<\/p>\n<p>That leaves a choice between WordPress plugin or fresh build. The answer? Both.<\/p>\n<p>A WordPress plugin will act as a proof of concept and a working prototype, initially, because it\'s easier to leverage the existing WordPress ecosystem to create it than to go into a cave for 6 months trying to build this amazing thing that everyone will have forgotten about.<\/p>\n<p>The plugin will not be perfect. It will add the Ghost UI\/UX and as much functionality as we can cram into it. It will completely remove \/wp-admin\/ and replace it with \/ghost\/ - effectively using WordPress core as a basic foundation to build on top of. It will give people who don\'t want to switch away from WordPress access to the Ghost UX which they want to have, and it will give people who want the full Ghost platform a taste of what\'s to come.<\/p>\n<p>It will allow us to develop and learn and iterate on the concept pretty rapidly, which has a great deal of value.<\/p>\n<p>This is step one. Assuming the plugin is actually used by people - it would then justify exploring building the standalone version of Ghost from the ground up. The plugin would subsequently serve as a great marketing tool for the platform. Think of it as an upgrade path. But that\'s a long way away. Having the idea is the easy part. Making it happen is what counts.<\/p>\n<p>Happily - amongst the thousands of people talking about Ghost for the last few days - several have been talking about how they\'ve already built some working prototypes of my mockups and turned them into WordPress plugins or just local development sites. These will likely go on to be the starting point of the first Ghost plugin.<\/p>\n<p>There\'s a lot to do, and I\'m amazed by the number of people who have offered their help with this. In the next few days I\'ll be kicking off work on the plugin properly and start putting together a more organised structure which explains how you can get involved and contribute to the project if you\'re interested. So... watch this space - and thanks for all your support so far.<\/p>\n<p><a href="http:\/\/twitter.com\/TryGhost" onclick="javascript:_gaq.push([\'_trackEvent\',\'outbound-article\',\'http:\/\/twitter.com\']);" class="twitter-follow-button">Follow @TryGhost<\/a><\/p>',
            feature_image: '__GHOST_URL__/ghostpost.jpg',
            status: status,
            locale: locale,
            authors: authors
        });
    }

    function createUser(overrides) {
        const newObj = _.cloneDeep(overrides || {});

        if (!newObj.slug) {
            newObj.slug = 'slug_' + Date.now();
        }
        if (!newObj.email) {
            newObj.email = `test${newObj.slug}@ghost.org`;
        }

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            name: 'name',
            email: 'test@ghost.org',
            bio: 'bio',
            website: null,
            profile_image: null,
            status: 'active',
            password: 'Sl1m3rson99',
            created_by: DataGenerator.Content.users[0].id,
            created_at: new Date(),
            updated_at: new Date(),
            updated_by: DataGenerator.Content.users[0].id,
            visibility: 'public',
            location: 'location'
        });
    }

    function createClient(overrides) {
        overrides = overrides || {};

        const newObj = _.cloneDeep(overrides);
        const basics = createBasic(newObj);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            uuid: uuid.v4(),
            secret: 'not_available',
            redirection_uri: 'http://localhost:9999',
            client_uri: 'http://localhost:9000',
            slug: 'client',
            name: 'client',
            type: 'ua',
            status: 'enabled'
        }, basics);
    }

    function createGenericUser(uniqueInteger) {
        return createUser({
            name: 'Joe Bloggs',
            slug: 'joe-blogs',
            email: 'joe_' + uniqueInteger + '@example.com',
            password: 'Sl1m3rson99'
        });
    }

    function createPostsTags(postId, tagId) {
        return {
            id: ObjectId().toHexString(),
            post_id: postId,
            tag_id: tagId
        };
    }

    function createUsersRoles(userId, roleId) {
        return {
            id: ObjectId().toHexString(),
            user_id: userId,
            role_id: roleId
        };
    }

    function createPostsAuthors(postId, authorId, sort_order = 0) {
        return {
            id: ObjectId().toHexString(),
            author_id: authorId,
            post_id: postId,
            sort_order: sort_order
        };
    }

    function createNewsletter(overrides) {
        const newObj = _.cloneDeep(overrides);
        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            uuid: uuid.v4(),
            slug: 'daily-newsletter',
            name: 'Daily Newsletter',
            sender_name: 'Jamie Larsen',
            sender_email: 'jamie@example.com',
            sender_reply_to: 'newsletter',
            status: 'active',
            visibility: 'members',
            subscribe_on_signup: true,
            title_font_category: 'serif',
            body_font_category: 'serif',
            show_header_icon: true,
            show_header_title: true,
            show_badge: true,
            sort_order: 0
        });
    }

    function createOffer(overrides) {
        const newObj = _.cloneDeep(overrides);
        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            name: 'Black Friday',
            code: 'black-friday',
            display_title: 'Black Friday Sale!',
            display_description: '10% off on yearly plan',
            discount_type: 'percent',
            interval: 'year',
            discount_amount: 12,
            duration: 'once',
            duration_in_months: null,
            currency_restriction: false,
            currency: null,
            active: true
        });
    }

    function createMember(overrides) {
        const newObj = _.cloneDeep(overrides);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            email: 'member@ghost.org'
        });
    }

    function createMemberWithNewsletter(overrides) {
        const newObj = _.cloneDeep(overrides);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            email: 'member@ghost.org',
            newsletters: [{
                id: 'newsletter-1'
            }]
        });
    }

    function createMemberWithProducts(overrides) {
        const newObj = _.cloneDeep(overrides);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            email: 'member@ghost.org',
            products: [{
                id: 'product-1'
            }]
        });
    }

    function createLabel(overrides) {
        const newObj = _.cloneDeep(overrides);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            name: 'label',
            slug: 'slug',
            created_by: DataGenerator.Content.users[0].id,
            created_at: new Date(),
            updated_by: DataGenerator.Content.users[0].id,
            updated_at: new Date()
        });
    }

    function createProduct(overrides) {
        const newObj = _.cloneDeep(overrides);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            name: 'product',
            slug: 'gold',
            active: true,
            type: 'paid',
            currency: 'usd',
            monthly_price: 500,
            yearly_price: 5000,
            visibility: 'public',
            benefits: [],
            created_by: DataGenerator.Content.users[0].id,
            created_at: new Date(),
            updated_by: DataGenerator.Content.users[0].id,
            updated_at: new Date()
        });
    }

    function createMembersLabels(member_id, label_id, sort_order = 0) {
        return {
            id: ObjectId().toHexString(),
            member_id,
            label_id,
            sort_order
        };
    }

    function createStripeProduct(product_id, stripe_product_id) {
        return {
            id: ObjectId().toHexString(),
            product_id,
            stripe_product_id
        };
    }

    function createSetting(overrides) {
        const newObj = _.cloneDeep(overrides);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            uuid: '95ce1c53-69b0-4f5f-be91-d3aeb39046b5',
            key: 'title',
            value: null,
            type: 'site',
            created_at: new Date(),
            created_by: DataGenerator.Content.users[0].id,
            updated_at: new Date(),
            updated_by: DataGenerator.Content.users[0].id
        });
    }

    function createToken(overrides) {
        const newObj = _.cloneDeep(overrides);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            token: uuid.v4(),
            expires: Date.now() + constants.ONE_DAY_MS
        });
    }

    function createInvite(overrides) {
        const newObj = _.cloneDeep(overrides);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            token: uuid.v4(),
            email: 'test@ghost.org',
            role_id: DataGenerator.Content.roles[0].id,
            expires: Date.now() + (60 * 1000),
            created_by: DataGenerator.Content.users[0].id,
            created_at: new Date(),
            status: 'sent'
        });
    }

    function createWebhook(overrides) {
        const newObj = _.cloneDeep(overrides);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            event: 'test',
            target_url: 'https://example.com/hooks/test',
            created_by: DataGenerator.Content.users[0].id,
            created_at: new Date(),
            updated_by: DataGenerator.Content.users[0].id,
            updated_at: new Date()
        });
    }

    function createIntegration(overrides) {
        const newObj = _.cloneDeep(overrides);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            name: 'test integration',
            slug: 'test-integration',
            created_by: DataGenerator.Content.users[0].id,
            created_at: new Date(),
            updated_by: DataGenerator.Content.users[0].id,
            updated_at: new Date()
        });
    }

    function createEmail(overrides) {
        const newObj = _.cloneDeep(overrides);

        return _.defaults(createBasic(newObj), {
            submitted_at: new Date()
        });
    }

    function createEmailBatch(overrides) {
        const newObj = _.cloneDeep(overrides);
        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            created_at: new Date(),
            updated_at: new Date()
        });
    }

    function createEmailRecipient(overrides) {
        const newObj = _.cloneDeep(overrides);
        return _.defaults(newObj, {
            id: ObjectId().toHexString()
        });
    }

    function createComment(overrides) {
        const memberIndex = overrides.member_index || 0;
        delete overrides.memberIndex;

        const newObj = _.cloneDeep(overrides);

        return _.defaults(newObj, {
            id: ObjectId().toHexString(),
            member_id: DataGenerator.Content.members[memberIndex].id,
            post_id: DataGenerator.Content.posts[0].id
        });
    }

    function createLink(overrides) {
        const newObj = _.cloneDeep(overrides);
        return _.defaults(newObj, {
            created_at: new Date(),
            updated_at: new Date()
        });
    }

    function createMention(overrides) {
        const newObj = _.cloneDeep(overrides);
        return _.defaults(newObj, {
            created_at: new Date()
        });
    }

    const posts = [
        createPost(DataGenerator.Content.posts[0]),
        createPost(DataGenerator.Content.posts[1]),
        createPost(DataGenerator.Content.posts[2]),
        createPost(DataGenerator.Content.posts[3]),
        createPost(DataGenerator.Content.posts[4]),
        createPost(DataGenerator.Content.posts[5]),
        createPost(DataGenerator.Content.posts[6]),
        createPost(DataGenerator.Content.posts[7])
    ];

    const tags = [
        createTag(DataGenerator.Content.tags[0]),
        createTag(DataGenerator.Content.tags[1]),
        createTag(DataGenerator.Content.tags[2]),
        createTag(DataGenerator.Content.tags[3]),
        createTag(DataGenerator.Content.tags[4])
    ];

    const roles = [
        createBasic(DataGenerator.Content.roles[0]),
        createBasic(DataGenerator.Content.roles[1]),
        createBasic(DataGenerator.Content.roles[2]),
        createBasic(DataGenerator.Content.roles[3]),
        createBasic(DataGenerator.Content.roles[4]),
        createBasic(DataGenerator.Content.roles[5])
    ];

    const users = [
        createUser(DataGenerator.Content.users[0]),
        createUser(DataGenerator.Content.users[1]),
        createUser(DataGenerator.Content.users[2]),
        createUser(DataGenerator.Content.users[3]),
        createUser(DataGenerator.Content.users[7])
    ];

    const roles_users = [
        {
            // owner
            id: ObjectId().toHexString(),
            role_name: 'Owner',
            user_id: DataGenerator.Content.users[0].id,
            role_id: DataGenerator.Content.roles[3].id
        },
        {
            // admin
            id: ObjectId().toHexString(),
            role_name: 'Administrator',
            user_id: DataGenerator.Content.users[1].id,
            role_id: DataGenerator.Content.roles[0].id
        },
        {
            // editor
            id: ObjectId().toHexString(),
            role_name: 'Editor',
            user_id: DataGenerator.Content.users[2].id,
            role_id: DataGenerator.Content.roles[1].id
        },
        {
            // author
            id: ObjectId().toHexString(),
            role_name: 'Author',
            user_id: DataGenerator.Content.users[3].id,
            role_id: DataGenerator.Content.roles[2].id
        },
        {
            // contributor
            id: ObjectId().toHexString(),
            role_name: 'Contributor',
            user_id: DataGenerator.Content.users[7].id,
            role_id: DataGenerator.Content.roles[4].id
        }
    ];

    const posts_meta = [
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[2].id,
            meta_description: 'meta description for short and sweet'
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[3].id,
            meta_description: 'meta description for draft post'
        }
    ];

    // this is not pretty, but the fastest
    // it relies on the created posts/tags
    const posts_tags = [
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[0].id,
            tag_id: DataGenerator.Content.tags[0].id,
            sort_order: 0
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[0].id,
            tag_id: DataGenerator.Content.tags[1].id,
            sort_order: 1
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[1].id,
            tag_id: DataGenerator.Content.tags[0].id,
            sort_order: 0
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[1].id,
            tag_id: DataGenerator.Content.tags[1].id,
            sort_order: 1
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[2].id,
            tag_id: DataGenerator.Content.tags[2].id,
            sort_order: 0
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[3].id,
            tag_id: DataGenerator.Content.tags[3].id,
            sort_order: 0
        }
    ];

    const members_newsletters = [
        {
            id: ObjectId().toHexString(),
            member_id: DataGenerator.Content.members[0].id,
            newsletter_id: DataGenerator.Content.newsletters[0].id
        },
        {
            id: ObjectId().toHexString(),
            member_id: DataGenerator.Content.members[1].id,
            newsletter_id: DataGenerator.Content.newsletters[0].id
        },
        {
            id: ObjectId().toHexString(),
            member_id: DataGenerator.Content.members[2].id,
            newsletter_id: DataGenerator.Content.newsletters[0].id
        },
        {
            id: ObjectId().toHexString(),
            member_id: DataGenerator.Content.members[3].id,
            newsletter_id: DataGenerator.Content.newsletters[1].id
        },
        // Member index 4 (comped@test.com), subscribed to two active newsletters
        {
            id: ObjectId().toHexString(),
            member_id: DataGenerator.Content.members[4].id,
            newsletter_id: DataGenerator.Content.newsletters[0].id
        },
        {
            id: ObjectId().toHexString(),
            member_id: DataGenerator.Content.members[4].id,
            newsletter_id: DataGenerator.Content.newsletters[1].id
        },
        // Member index 5 (vip@test.com), subscribed to an active and archived newsletter
        {
            id: ObjectId().toHexString(),
            member_id: DataGenerator.Content.members[5].id,
            newsletter_id: DataGenerator.Content.newsletters[1].id
        },
        {
            id: ObjectId().toHexString(),
            member_id: DataGenerator.Content.members[5].id,
            newsletter_id: DataGenerator.Content.newsletters[2].id
        },
        // Member index 6 (vip-paid@test.com), subscribed to an archived newsletter
        {
            id: ObjectId().toHexString(),
            member_id: DataGenerator.Content.members[6].id,
            newsletter_id: DataGenerator.Content.newsletters[2].id
        }
        // Member index 7 (with-product@test.com), subscribed to no newsletter
    ];

    const posts_authors = [
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[0].id,
            author_id: DataGenerator.Content.users[0].id,
            sort_order: 0
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[1].id,
            author_id: DataGenerator.Content.users[0].id,
            sort_order: 0
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[2].id,
            author_id: DataGenerator.Content.users[0].id,
            sort_order: 0
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[3].id,
            author_id: DataGenerator.Content.users[0].id,
            sort_order: 0
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[3].id,
            author_id: _.find(DataGenerator.Content.users, {email: 'jbOgendAth@example.com'}).id,
            sort_order: 1
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[4].id,
            author_id: DataGenerator.Content.users[0].id,
            sort_order: 0
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[4].id,
            author_id: _.find(DataGenerator.Content.users, {slug: 'slimer-mcectoplasm'}).id,
            sort_order: 1
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[5].id,
            author_id: DataGenerator.Content.users[0].id,
            sort_order: 0
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[6].id,
            author_id: DataGenerator.Content.users[0].id,
            sort_order: 0
        },
        {
            id: ObjectId().toHexString(),
            post_id: DataGenerator.Content.posts[7].id,
            author_id: DataGenerator.Content.users[0].id,
            sort_order: 0
        }
    ];

    const invites = [
        createInvite({email: 'test1@ghost.org', role_id: DataGenerator.Content.roles[0].id}),
        createInvite({email: 'test2@ghost.org', role_id: DataGenerator.Content.roles[2].id})
    ];

    const webhooks = [
        createWebhook(DataGenerator.Content.webhooks[0]),
        createWebhook(DataGenerator.Content.webhooks[1])
    ];

    const integrations = [
        createBasic(DataGenerator.Content.integrations[0]),
        createBasic(DataGenerator.Content.integrations[1]),
        createBasic(DataGenerator.Content.integrations[2]),
        createBasic(DataGenerator.Content.integrations[3])
    ];

    const api_keys = [
        createBasic(DataGenerator.Content.api_keys[0]),
        createBasic(DataGenerator.Content.api_keys[1]),
        createBasic(DataGenerator.Content.api_keys[2]),
        createBasic(DataGenerator.Content.api_keys[3]),
        createBasic(DataGenerator.Content.api_keys[4])
    ];

    const emails = [
        createEmail(DataGenerator.Content.emails[0]),
        createEmail(DataGenerator.Content.emails[1])
    ];

    const email_batches = [
        createEmailBatch(DataGenerator.Content.email_batches[0])
    ];

    const email_recipients = [
        createEmailRecipient(DataGenerator.Content.email_recipients[0]),
        createEmailRecipient(DataGenerator.Content.email_recipients[1]),
        createEmailRecipient(DataGenerator.Content.email_recipients[2]),
        createEmailRecipient(DataGenerator.Content.email_recipients[3]),
        createEmailRecipient(DataGenerator.Content.email_recipients[4]),
        createEmailRecipient(DataGenerator.Content.email_recipients[5])
    ];

    const email_recipient_failures = email_recipients.flatMap((recipient) => {
        if (recipient.failed_at === null) {
            if (recipient.delivered_at === null) {
                return [{
                    id: ObjectId().toHexString(),
                    email_recipient_id: recipient.id,
                    email_id: recipient.email_id,
                    member_id: recipient.member_id,
                    code: 555,
                    message: 'Temporary failure',
                    enhanced_code: '5.5.5',
                    severity: 'temporary',
                    failed_at: recipient.processed_at,
                    event_id: 'event-id-' + ObjectId().toHexString()
                }];
            }

            return [];
        }
        return [{
            id: ObjectId().toHexString(),
            email_recipient_id: recipient.id,
            email_id: recipient.email_id,
            member_id: recipient.member_id,
            code: 555,
            message: 'Test failure',
            enhanced_code: '5.5.5',
            severity: 'permanent',
            failed_at: recipient.failed_at,
            event_id: 'event-id-' + ObjectId().toHexString()
        }];
    });

    const members = [
        createMember(DataGenerator.Content.members[0]),
        createMember(DataGenerator.Content.members[1]),
        createMember(DataGenerator.Content.members[2]),
        createMember(DataGenerator.Content.members[3]),
        createMember(DataGenerator.Content.members[4]),
        createMember(DataGenerator.Content.members[5]),
        createMember(DataGenerator.Content.members[6]),
        createMember(DataGenerator.Content.members[7])
    ];

    const members_created_events = members.map((member, index) => {
        const sources = [
            {
                referrer_source: 'Twitter',
                referrer_medium: 'Social',
                referrer_url: 'https://twitter.com'
            },
            {
                referrer_source: 'Direct',
                referrer_medium: null,
                referrer_url: null
            }
        ];
        return {
            id: ObjectId().toHexString(),
            member_id: member.id,
            source: 'system',
            attribution_type: 'post',
            attribution_id: DataGenerator.Content.posts[index % 3].id,
            attribution_url: '/' + DataGenerator.Content.posts[index % 3].slug,
            ...sources[index % 2]
        };
    });

    const newsletters = [
        createNewsletter(DataGenerator.Content.newsletters[0]),
        createNewsletter(DataGenerator.Content.newsletters[1]),
        createNewsletter(DataGenerator.Content.newsletters[2])

    ];

    const labels = [
        createLabel(DataGenerator.Content.labels[0]),
        createLabel(DataGenerator.Content.labels[2])
    ];

    const members_labels = [
        createMembersLabels(
            DataGenerator.Content.members[0].id,
            DataGenerator.Content.labels[0].id
        ),
        createMembersLabels(
            DataGenerator.Content.members[5].id,
            DataGenerator.Content.labels[2].id
        ),
        createMembersLabels(
            DataGenerator.Content.members[6].id,
            DataGenerator.Content.labels[2].id
        )
    ];

    const products = [
        DataGenerator.Content.products[0],
        DataGenerator.Content.products[1]
    ];

    const members_stripe_customers = [
        createBasic(DataGenerator.Content.members_stripe_customers[0]),
        createBasic(DataGenerator.Content.members_stripe_customers[1]),
        createBasic(DataGenerator.Content.members_stripe_customers[2]),
        createBasic(DataGenerator.Content.members_stripe_customers[3]),
        createBasic(DataGenerator.Content.members_stripe_customers[4])
    ];

    const stripe_products = [
        createStripeProduct(
            DataGenerator.Content.products[0].id,
            DataGenerator.Content.stripe_products[0].stripe_product_id
        )
    ];

    const stripe_prices = [
        createBasic(DataGenerator.Content.stripe_prices[0]),
        createBasic(DataGenerator.Content.stripe_prices[1]),
        createBasic(DataGenerator.Content.stripe_prices[2]),
        createBasic(DataGenerator.Content.stripe_prices[3]),
        createBasic(DataGenerator.Content.stripe_prices[4])
    ];

    const stripe_customer_subscriptions = [
        createBasic(DataGenerator.Content.members_stripe_customers_subscriptions[0]),
        createBasic(DataGenerator.Content.members_stripe_customers_subscriptions[1]),
        createBasic(DataGenerator.Content.members_stripe_customers_subscriptions[2])
    ];

    const members_subscription_created_events = stripe_customer_subscriptions.map((subscription, index) => {
        const sources = [
            {
                referrer_source: 'Twitter',
                referrer_medium: 'Social',
                referrer_url: 'https://twitter.com'
            },
            {
                referrer_source: 'Direct',
                referrer_medium: null,
                referrer_url: null
            }
        ];
        return {
            id: ObjectId().toHexString(),
            member_id: members[index].id,
            subscription_id: subscription.id,
            source: 'system',
            attribution_type: 'post',
            attribution_id: DataGenerator.Content.posts[index % 3].id,
            attribution_url: '/' + DataGenerator.Content.posts[index % 3].slug,
            ...sources[index % 2]
        };
    });

    const members_paid_subscription_events = [
        createBasic(DataGenerator.Content.members_paid_subscription_events[0]),
        createBasic(DataGenerator.Content.members_paid_subscription_events[1]),
        createBasic(DataGenerator.Content.members_paid_subscription_events[2]),
        ...members_subscription_created_events.map((e) => {
            return {
                id: ObjectId().toHexString(),
                type: 'created',
                mrr_delta: 1000,
                currency: 'usd',
                source: 'stripe',
                subscription_id: e.subscription_id,
                member_id: e.member_id,
                from_plan: null,
                to_plan: '173e16a1fffa7d232b398e4a9b08d266a456ae8f3d23e5f11cc608ced6730bb8'
            };
        })
    ];

    const redirects = posts.map((post, index) => {
        return {
            id: ObjectId().toHexString(),
            from: '/r/' + index,
            to: 'https:://ghost.org',
            post_id: post.id,
            created_at: new Date(),
            updated_at: new Date()
        };
    });

    const members_click_events = redirects.map((redirect, index) => {
        return {
            id: ObjectId().toHexString(),
            member_id: members[index].id,
            redirect_id: redirect.id,
            created_at: new Date()
        };
    });

    const members_feedback = posts.map((redirect, index) => {
        return {
            id: ObjectId().toHexString(),
            member_id: members[index].id,
            post_id: redirect.id,
            score: index % 2,
            created_at: new Date()
        };
    });

    const snippets = [
        createBasic(DataGenerator.Content.snippets[0])
    ];

    const custom_theme_settings = [
        createBasic(DataGenerator.Content.custom_theme_settings[0]),
        createBasic(DataGenerator.Content.custom_theme_settings[1])
    ];

    const comments = [
        createComment(DataGenerator.Content.comments[0]),
        createComment(DataGenerator.Content.comments[1])
    ];

    const links = [
        createLink(DataGenerator.Content.links[0]),
        createLink(DataGenerator.Content.links[1]),
        createLink(DataGenerator.Content.links[2])
    ];

    const mentions = [
        createMention(DataGenerator.Content.mentions[0]),
        createMention(DataGenerator.Content.mentions[1]),
        createMention(DataGenerator.Content.mentions[2])
    ];

    return {
        createPost,
        createGenericPost,
        createTag,
        createUser,
        createUsersRoles,
        createPostsAuthors,
        createClient,
        createGenericUser,
        createBasic,
        createRole: createBasic,
        createPermission: createBasic,
        createPostsTags,
        createSetting,
        createToken,
        createMember,
        createMemberWithNewsletter,
        createMemberWithProducts,
        createLabel,
        createMembersLabels,
        createMembersStripeCustomer: createBasic,
        createStripeCustomerSubscription: createBasic,
        createInvite,
        createWebhook,
        createIntegration,
        createEmail,
        createCustomThemeSetting: createBasic,
        createProduct,
        createNewsletter,
        createOffer,
        createComment,
        createMention,

        invites,
        posts,
        tags,
        posts_meta,
        posts_tags,
        posts_authors,
        members_newsletters,
        roles,
        users,
        roles_users,
        webhooks,
        integrations,
        api_keys,
        emails,
        email_batches,
        email_recipients,
        email_recipient_failures,
        labels,
        members,
        products,
        newsletters,
        members_labels,
        members_stripe_customers,
        stripe_customer_subscriptions,
        stripe_prices,
        stripe_products,
        snippets,
        custom_theme_settings,
        comments,
        redirects,
        links,
        mentions,

        members_paid_subscription_events,
        members_created_events,
        members_subscription_created_events,
        members_click_events,
        members_feedback
    };
}());

// @TODO: this logic only exists because we are now using our models :/
DataGenerator.forModel = (function () {
    let posts;
    let tags;
    let users;
    let roles;

    posts = _.map(DataGenerator.Content.posts, function (post) {
        return _.pick(post, 'title', 'mobiledoc');
    });

    tags = DataGenerator.Content.tags;

    users = _.map(DataGenerator.Content.users, function (user) {
        user = _.pick(user, 'name', 'email');

        return _.defaults({
            password: 'Sl1m3rson99'
        }, user);
    });

    roles = _.map(DataGenerator.Content.roles, function (role) {
        return _.extend({}, role, {id: ObjectId().toHexString()});
    });

    return {
        posts: posts,
        tags: tags,
        users: users,
        roles: roles
    };
}());

module.exports = DataGenerator;
