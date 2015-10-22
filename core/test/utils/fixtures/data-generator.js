var _             = require('lodash'),
    uuid          = require('node-uuid'),
    globalUtils   = require('../../../server/utils'),
    DataGenerator = {};
/*jshint quotmark:false*/
// jscs:disable validateQuoteMarks, requireCamelCaseOrUpperCaseIdentifiers
DataGenerator.Content = {
    posts: [
        {
            title: "HTML Ipsum",
            slug: "html-ipsum",
            markdown: "<h1>HTML Ipsum Presents</h1><p><strong>Pellentesque habitant morbi tristique</strong> senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. <em>Aenean ultricies mi vitae est.</em> Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, <code>commodo vitae</code>, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui. <a href=\"#\">Donec non enim</a> in turpis pulvinar facilisis. Ut felis.</p><h2>Header Level 2</h2><ol><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ol><blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus magna. Cras in mi at felis aliquet congue. Ut a est eget ligula molestie gravida. Curabitur massa. Donec eleifend, libero at sagittis mollis, tellus est malesuada tellus, at luctus turpis elit sit amet quam. Vivamus pretium ornare est.</p></blockquote><h3>Header Level 3</h3><ul><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ul><pre><code>#header h1 a{display: block;width: 300px;height: 80px;}</code></pre>",
            published_at: new Date("2015-01-01")
        },
        {
            title: "Ghostly Kitchen Sink",
            slug: "ghostly-kitchen-sink",
            markdown: "<h1>HTML Ipsum Presents</h1><p><strong>Pellentesque habitant morbi tristique</strong> senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. <em>Aenean ultricies mi vitae est.</em> Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, <code>commodo vitae</code>, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui. <a href=\"#\">Donec non enim</a> in turpis pulvinar facilisis. Ut felis.</p><h2>Header Level 2</h2><ol><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ol><blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus magna. Cras in mi at felis aliquet congue. Ut a est eget ligula molestie gravida. Curabitur massa. Donec eleifend, libero at sagittis mollis, tellus est malesuada tellus, at luctus turpis elit sit amet quam. Vivamus pretium ornare est.</p></blockquote><h3>Header Level 3</h3><ul><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ul><pre><code>#header h1 a{display: block;width: 300px;height: 80px;}</code></pre>",
            published_at: new Date("2015-01-02")
        },
        {
            title: "Short and Sweet",
            slug: "short-and-sweet",
            markdown: "## testing\n\nmctesters\n\n- test\n- line\n- items",
            html: "<h2 id=\"testing\">testing</h2>\n\n<p>mctesters</p>\n\n<ul>\n<li>test</li>\n<li>line</li>\n<li>items</li>\n</ul>",
            image: "http://placekitten.com/500/200",
            meta_description: "test stuff",
            published_at: new Date("2015-01-03"),
            uuid: "2ac6b4f6-e1f3-406c-9247-c94a0496d39d"
        },
        {
            title: "Not finished yet",
            slug: "unfinished",
            markdown: "<h1>HTML Ipsum Presents</h1><p><strong>Pellentesque habitant morbi tristique</strong> senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. <em>Aenean ultricies mi vitae est.</em> Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat wisi, condimentum sed, <code>commodo vitae</code>, ornare sit amet, wisi. Aenean fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci, sagittis tempus lacus enim ac dui. <a href=\"#\">Donec non enim</a> in turpis pulvinar facilisis. Ut felis.</p><h2>Header Level 2</h2><ol><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ol><blockquote><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus magna. Cras in mi at felis aliquet congue. Ut a est eget ligula molestie gravida. Curabitur massa. Donec eleifend, libero at sagittis mollis, tellus est malesuada tellus, at luctus turpis elit sit amet quam. Vivamus pretium ornare est.</p></blockquote><h3>Header Level 3</h3><ul><li>Lorem ipsum dolor sit amet, consectetuer adipiscing elit.</li><li>Aliquam tincidunt mauris eu risus.</li></ul><pre><code>#header h1 a{display: block;width: 300px;height: 80px;}</code></pre>",
            status: "draft",
            uuid: "d52c42ae-2755-455c-80ec-70b2ec55c903",
            featured: false
        },
        {
            title: "Not so short, bit complex",
            slug: "not-so-short-bit-complex",
            markdown: "<p><nav><ul><li><a href=\"#nowhere\" title=\"Anchor URL\">Lorem</a></li><li><a href=\"/about#nowhere\" title=\"Relative URL\">Aliquam</a></li><li><a href=\"//somewhere.com/link#nowhere\" title=\"Protocol Relative URL\">Tortor</a></li><li><a href=\"http://somewhere.com/link#nowhere\" title=\"Absolute URL\">Morbi</a></li><li><a href=\"#nowhere\" title=\"Praesent dapibus, neque id cursus faucibus\">Praesent</a></li><li><a href=\"#nowhere\" title=\"Pellentesque fermentum dolor\">Pellentesque</a></li></ul></nav><p>Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo.</p><table><thead><tr><th>1</th><th>2</th><th>3</th><th>4</th></tr></thead><tbody><tr><td>a</td><td>b</td><td>c</td><td>d</td></tr><tr><td>e</td><td>f</td><td>g</td><td>h</td></tr><tr><td>i</td><td>j</td><td>k</td><td>l</td></tr></tbody></table><dl><dt>Definition list</dt><dd>Consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</dd><dt>Lorem ipsum dolor sit amet</dt><dd>Consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</dd></dl><ul><li>Morbi in sem quis dui placerat ornare. Pellentesque odio nisi, euismod in, pharetra a, ultricies in, diam. Sed arcu. Cras consequat.</li><li>Praesent dapibus, neque id cursus faucibus, tortor neque egestas augue, eu vulputate magna eros eu erat. Aliquam erat volutpat. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus, metus.</li><li>Phasellus ultrices nulla quis nibh. Quisque a lectus. Donec consectetuer ligula vulputate sem tristique cursus. Nam nulla quam, gravida non, commodo a, sodales sit amet, nisi.</li><li>Pellentesque fermentum dolor. Aliquam quam lectus, facilisis auctor, ultrices ut, elementum vulputate, nunc.</li></ul></p>"
        },
        {
            title: "This is a static page",
            slug: "static-page-test",
            markdown: "<h1>Static page test is what this is for.</h1><p>Hopefully you don't find it a bore.</p>",
            page: 1
        },
        {
            title: "This is a draft static page",
            slug: "static-page-draft",
            markdown: "<h1>Static page test is what this is for.</h1><p>Hopefully you don't find it a bore.</p>",
            page: 1,
            status: "draft"
        }
    ],

    tags: [
        {
            name: "kitchen sink",
            slug: "kitchen-sink"
        },
        {
            name: "bacon",
            slug: "bacon"
        },
        {
            name: "chorizo",
            slug: "chorizo"
        },
        {
            name: "pollo",
            slug: "pollo"
        },
        {
            name: "injection",
            slug: "injection"
        }
    ],

    // Password = Sl1m3rson
    users: [
        {
            name: 'Joe Bloggs',
            slug: 'joe-bloggs',
            email: 'jbloggs@example.com',
            password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6'
        },
        {
            name: 'Smith Wellingsworth',
            slug: 'smith-wellingsworth',
            email: 'swellingsworth@example.com',
            password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6'
        },
        {
            name: 'Jimothy Bogendath',
            slug: 'jimothy-bogendath',
            email: 'jbOgendAth@example.com',
            password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6'
        },
        {
            name: 'Slimer McEctoplasm',
            slug: 'slimer-mcectoplasm',
            email: 'smcectoplasm@example.com',
            password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6'
        },
        {
            name: 'Ivan Email',
            slug: 'ivan-email',
            email: 'info@ghost.org',
            password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6'
        }
    ],

    permissions: [
        {
            name: 'Browse posts',
            action_type: 'browse',
            object_type: 'post'
        },
        {
            name: 'test',
            action_type: 'edit',
            object_type: 'post'
        },
        {
            name: 'test',
            action_type: 'edit',
            object_type: 'tag'
        },
        {
            name: 'test',
            action_type: 'edit',
            object_type: 'user'
        },
        {
            name: 'test',
            action_type: 'edit',
            object_type: 'page'
        },
        {
            name: 'test',
            action_type: 'add',
            object_type: 'post'
        },
        {
            name: 'test',
            action_type: 'add',
            object_type: 'user'
        },
        {
            name: 'test',
            action_type: 'add',
            object_type: 'page'
        },
        {
            name: 'test',
            action_type: 'destroy',
            object_type: 'post'
        },
        {
            name: 'test',
            action_type: 'destroy',
            object_type: 'user'
        }
    ],

    roles: [
        {
            name:             'Administrator',
            description:      'Administrators'
        },
        {
            name:             'Editor',
            description:      'Editors'
        },
        {
            name:             'Author',
            description:      'Authors'
        },
        {
            name:             'Owner',
            description:      'Blog Owner'
        }
    ],

    apps: [
        {
            name: 'Kudos',
            slug: 'kudos',
            version: '0.0.1',
            status: 'installed'
        },
        {
            name: 'Importer',
            slug: 'importer',
            version: '0.1.0',
            status: 'inactive'
        },
        {
            name: 'Hemingway',
            slug: 'hemingway',
            version: '1.0.0',
            status: 'installed'
        }
    ],

    app_fields: [
        {
            key: 'count',
            value: '120',
            type: 'number',
            active: true
        },
        {
            key: 'words',
            value: '512',
            type: 'number',
            active: true
        }
    ],

    app_settings: [
        {
            key: 'color',
            value: 'ghosty'
        },
        {
            key: 'setting',
            value: 'value'
        }
    ]
};

DataGenerator.forKnex = (function () {
    var posts,
        tags,
        posts_tags,
        apps,
        app_fields,
        roles,
        users,
        roles_users,
        clients;

    function createBasic(overrides) {
        return _.defaults(overrides, {
            uuid: uuid.v4(),
            created_by: 1,
            created_at: new Date(),
            updated_by: 1,
            updated_at: new Date()
        });
    }

    function createPost(overrides) {
        return _.defaults(overrides, {
            uuid: uuid.v4(),
            status: 'published',
            html: overrides.markdown,
            language: 'en_US',
            featured: true,
            page: false,
            author_id: 1,
            updated_at: new Date(),
            updated_by: 1,
            created_at: new Date(),
            created_by: 1,
            published_at: new Date(),
            published_by: 1
        });
    }

    function createGenericPost(uniqueInteger, status, language, author_id) {
        status = status || 'draft';
        language = language || 'en_US';
        author_id = author_id || 1;

        return createPost({
            uuid: uuid.v4(),
            title: 'Test Post ' + uniqueInteger,
            slug: 'ghost-from-fiction-to-function-' + uniqueInteger,
            author_id: author_id,
            markdown: "Three days ago I released a <a title=\"Ghost\" href=\"http:\/\/john.onolan.org\/ghost\/\">concept page<\/a> for a lite version of WordPress that I've been thinking about for a long time, called Ghost. I think it's fair to say that I didn't quite anticipate how strong the reaction would be - and I've hardly had time to catch my breath in the last 72 hours.\n\nThe response was overwhelming, and overwhelmingly positive. In the first 6 hours my site got 35,000 page views after hitting the number 1 slot on <a href=\"http:\/\/news.ycombinator.com\/item?id=4743245\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/news.ycombinator.com']);\">Hacker News<\/a>.&nbsp;As of right now, the traffic count is just over <a href=\"http:\/\/john.onolan.org\/wp-content\/uploads\/2012\/11\/Screen-Shot-2012-11-09-at-17.51.21.png\" rel=\"lightbox\" class=\"cboxElement\">91,000 page views<\/a>&nbsp;- and Ghost has been featured all over the place. Notable mentions so far include Christina Warren from Mashable, who <a href=\"http:\/\/christina.is\/\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/christina.is']);\">wrote about it<\/a>. Michael Carney from PandoDaily <a href=\"http:\/\/pandodaily.com\/2012\/11\/07\/wordpress-guru-designs-a-concept-blogging-platform-that-doesnt-suck-gets-rave-reviews\/\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/pandodaily.com']);\">interviewed me about it<\/a>. Someone even <a href=\"http:\/\/www.voicens.com\/web\/?p=4425\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/www.voicens.com']);\">wrote about it in Chinese<\/a>. That's pretty cool.\n\n\nThe feedback has been amazing, and while it's impossible to reply to all of the messages individually, I'm getting to as many of them as I can and I want to thank each and every one of you who took the time to send me a message or share the concept because you liked it. Now that the initial storm has died down a bit, I wanted to take some time to answer some of the more common questions and talk about what's next.\n<h2>FAQ - Continued...<\/h2>\n\nThe most common question, bizarrely:\n<h5><em><strong>Oh my god, why is that whole page made of images? What's wrong with you? \/\/ I can't take you seriously \/\/ Don't you know anything about the web? \/\/ You are literally Satan re-incarnate.<\/strong><\/em><\/h5>\n\nThis was really the only negativity I got in response to the post, and it surprised me. I put together the concept page as... just that... a concept. It was a way for me to get the ideas out of my head and \"down on paper\" - or so to speak. I used photoshop as a <em>tool<\/em> to write down my idea with text and images. If I used a sketchbook as a <em>tool&nbsp;<\/em>to create images and handwritten notes, then uploaded scans of it, I doubt anyone would complain. The concept page was never supposed to be a finished product because I had no idea if there would be any interest in it. I had no motivation to waste hours coding a custom layout for something might only ever be read by a few people and then forgotten.\n\nHardware manufacturers make hundreds of foam cutout prototypes of products before they build one with working buttons and screens. I'm aware of all the usability problems with a web page made of images, and equally, foam cutouts without buttons or screens aren't particularly user friendly either. They're not supposed to be.\n\nLet's move on.\n<h5><em><strong>What? Why no comments? I need comments.<\/strong><\/em><\/h5>\n\nBecause comments add a layer of complexity that is beyond the core focus of this platform, which is publishing. Again, that's not to say you couldn't have any comments. This could easily be added with a dedicated plugin where you own the data or (as mentioned) there are third party providers such as Disqus, IntenseDebate, Livefyre and Facebook who all have great platforms. The point of this isn't to say \"you can't have comments\" - it's to say \"comments aren't on by default\". It's about simplicity, more than anything else.\n<h5><em><strong>Yeah, but WordPress are already going to revise their dashboard, WordPress.com is experimenting with a potential simplified version... so why bother with this?<\/strong><\/em><\/h5>\n\n<a href=\"http:\/\/john.onolan.org\/wp-content\/uploads\/2012\/11\/newwp.png\" rel=\"lightbox[2102]\" title=\"newwp\" class=\"cboxElement\"><img class=\"alignnone size-large wp-image-2117\" title=\"newwp\" src=\"http:\/\/john.onolan.org\/wp-content\/uploads\/2012\/11\/newwp-550x210.png\" alt=\"\" width=\"550\" height=\"210\"><\/a>\n\nSorry, but Tumblr already did this - it's not the future of blogging, it's the past.\n\nGhost isn't about sharing \"Fuck Yeah [<a href=\"http:\/\/fuckyeahdogs.tumblr.com\/\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/fuckyeahdogs.tumblr.com']);\">Dogs<\/a>\/<a href=\"http:\/\/fuckyeahsharks.tumblr.com\/\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/fuckyeahsharks.tumblr.com']);\" rel=\"lightbox\" class=\"cboxElement\">Sharks<\/a>\/<a href=\"http:\/\/fuckyeahgirlswithtattoos.tumblr.com\/\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/fuckyeahgirlswithtattoos.tumblr.com']);\">Girls with Tattoos<\/a>]\" - it's about publishing - which means writing - rather than mashing a few buttons to make sure that everyone can see and appreciate your latest funny picture\/status, which is surely the most funny picture\/status you've ever posted.\n\nTumblr, Pinterest and Facebook already have this locked down.&nbsp;It's not the future.\n<h5><em><strong>So... are you actually going to build this thing?<\/strong><\/em><\/h5>\n\nThe concept page was a way for me to test demand and interest. To see if anyone actually agreed with my frustrations and, more importantly, my solutions. I plucked a random figure of \"10,000 pageviews\" out of the air before I hit the publish button. If it got less than 10,000 pageviews, I would surrender to the fact that it would only ever be an idea. I've now exceeded that goal 9 times over, so yes, I'm looking at how Ghost can now be made into a reality.\n<h5><em><strong>How can I find out when it's done? \/\/ SHUT UP AND TAKE MY MONEY<\/strong><\/em><\/h5>\n\nOk, ok - there's a holding page up on <a href=\"http:\/\/tryghost.org\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/tryghost.org']);\">http:\/\/TryGhost.org<\/a> - put your email address in.\n<hr>\n<h3>How are you going to do this?<\/h3>\n\nThere's three main ways of going about this, each has merits as well as drawbacks.\n\n<em><strong>1.) Build it from scratch<\/strong><\/em> - Many people (particularly the Hacker News crowd) expressed the sentiment that there was little point in forking WordPress. When you're going to strip out so much, you get to a point where you might as well start from scratch anyway. Take away the crutches of being stuck with older technologies and put together something which is as sophisticated in code as it is in UI\/UX.\n<ul>\n<li><em>Pros:<\/em> The idea of something completely new is exciting, opportunity to build something very sophisticated, complete control over everything.<\/li>\n<li><em>Cons:<\/em> Lose the &nbsp;WordPress ecosystem which includes millions of users and thousands of developers, potentially spend the next 6 months fighting over whether to use PHP\/RoR\/Django\/Python\/Node\/Whateverthefuck because everyone loves to evangelise the technology they know best.<\/li>\n<\/ul>\n\n<em><strong>2.) Fork WordPress<\/strong><\/em> - This was the original idea I put out. Take the WordPress codebase, as is, and modify it to turn it into something new. Initially the codebase is practically the same, which means developers already know it. Then it can change over time and evolve into its own thing.\n<ul>\n<li><em>Pros:<\/em> Easy start with existing codebase, potential to evolve, doesn't lose WordPress ecosystem initially.<\/li>\n<li><em>Cons:<\/em> Stuck with existing codebase - the good as well as the bad, &nbsp;eventually needs to be rewritten completely, less control, loses the WordPress ecosystem after a while anyway, makes it complicated to transition from legacy code to new code.<\/li>\n<\/ul>\n\n<em><strong>3.) Make it a plugin\/extension<\/strong><\/em> - Lots of people asked why Ghost couldn't just be a WordPress plugin. It would certainly be the easiest route of the 3, it's possible to completely remove \/wp-admin\/ and replace with with \/ghost\/ ... but I feel like it kind of misses the point. This route bolts Ghost on, but it's still WordPress under the hood. From a UI\/UX standpoint it would function - but it wouldn't revolutionise anything else. It makes WordPress itself about blogging again, rather than creating something new.\n<ul>\n<li><em>Pros:<\/em> Very easy development, very easy deployment, keeps WordPress ecosystem forever, doesn't force anyone to change.<\/li>\n<li><em>Cons:<\/em> The least exciting (for me, personally), much less control, it would be much harder to maintain something like this on a non-profit basis - which loses a piece of what Ghost is about.<\/li>\n<\/ul>\n<h3>What's the answer?<\/h3>\n\nI've spoken to a lot of smart people over the last few days. The one thing that everyone seems to agree on is that a fork is the worst of both worlds. So the one thing that I suggested as a way of making this happen, is the least likely to work in reality. Remember the foam prototype metaphor earlier? Learning and iterating - that's what happening now.\n\nThat leaves a choice between WordPress plugin or fresh build. The answer? Both.\n\nA WordPress plugin will act as a proof of concept and a working prototype, initially, because it's easier to leverage the existing WordPress ecosystem to create it than to go into a cave for 6 months trying to build this amazing thing that everyone will have forgotten about.\n\nThe plugin will not be perfect. It will add the Ghost UI\/UX and as much functionality as we can cram into it. It will completely remove \/wp-admin\/ and replace it with \/ghost\/ - effectively using WordPress core as a basic foundation to build on top of. It will give people who don't want to switch away from WordPress access to the Ghost UX which they want to have, and it will give people who want the full Ghost platform a taste of what's to come.\n\nIt will allow us to develop and learn and iterate on the concept pretty rapidly, which has a great deal of value.\n\nThis is step one. Assuming the plugin is actually used by people - it would then justify exploring building the standalone version of Ghost from the ground up. The plugin would subsequently serve as a great marketing tool for the platform. Think of it as an upgrade path. But that's a long way away. Having the idea is the easy part. Making it happen is what counts.\n\nHappily - amongst the thousands of people talking about Ghost for the last few days - several have been talking about how they've already built some working prototypes of my mockups and turned them into WordPress plugins or just local development sites. These will likely go on to be the starting point of the first Ghost plugin.<\/p>\n\nThere's a lot to do, and I'm amazed by the number of people who have offered their help with this. In the next few days I'll be kicking off work on the plugin properly and start putting together a more organised structure which explains how you can get involved and contribute to the project if you're interested. So... watch this space - and thanks for all your support so far.\n\n<a href=\"http:\/\/twitter.com\/TryGhost\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/twitter.com']);\" class=\"twitter-follow-button\">Follow @TryGhost<\/a>",
            html: "<p>Three days ago I released a <a title=\"Ghost\" href=\"http:\/\/john.onolan.org\/ghost\/\">concept page<\/a> for a lite version of WordPress that I've been thinking about for a long time, called Ghost. I think it's fair to say that I didn't quite anticipate how strong the reaction would be - and I've hardly had time to catch my breath in the last 72 hours.<\/p>\n<p>The response was overwhelming, and overwhelmingly positive. In the first 6 hours my site got 35,000 page views after hitting the number 1 slot on <a href=\"http:\/\/news.ycombinator.com\/item?id=4743245\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/news.ycombinator.com']);\">Hacker News<\/a>.&nbsp;As of right now, the traffic count is just over <a href=\"http:\/\/john.onolan.org\/wp-content\/uploads\/2012\/11\/Screen-Shot-2012-11-09-at-17.51.21.png\" rel=\"lightbox\" class=\"cboxElement\">91,000 page views<\/a>&nbsp;- and Ghost has been featured all over the place. Notable mentions so far include Christina Warren from Mashable, who <a href=\"http:\/\/christina.is\/\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/christina.is']);\">wrote about it<\/a>. Michael Carney from PandoDaily <a href=\"http:\/\/pandodaily.com\/2012\/11\/07\/wordpress-guru-designs-a-concept-blogging-platform-that-doesnt-suck-gets-rave-reviews\/\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/pandodaily.com']);\">interviewed me about it<\/a>. Someone even <a href=\"http:\/\/www.voicens.com\/web\/?p=4425\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/www.voicens.com']);\">wrote about it in Chinese<\/a>. That's pretty cool.\\n<p>The feedback has been amazing, and while it's impossible to reply to all of the messages individually, I'm getting to as many of them as I can and I want to thank each and every one of you who took the time to send me a message or share the concept because you liked it. Now that the initial storm has died down a bit, I wanted to take some time to answer some of the more common questions and talk about what's next.<\/p>\n<h2>FAQ - Continued...<\/h2>\n<p>The most common question, bizarrely:<\/p>\n<h5><em><strong>Oh my god, why is that whole page made of images? What's wrong with you? \/\/ I can't take you seriously \/\/ Don't you know anything about the web? \/\/ You are literally Satan re-incarnate.<\/strong><\/em><\/h5>\n<p>This was really the only negativity I got in response to the post, and it surprised me. I put together the concept page as... just that... a concept. It was a way for me to get the ideas out of my head and \"down on paper\" - or so to speak. I used photoshop as a <em>tool<\/em> to write down my idea with text and images. If I used a sketchbook as a <em>tool&nbsp;<\/em>to create images and handwritten notes, then uploaded scans of it, I doubt anyone would complain. The concept page was never supposed to be a finished product because I had no idea if there would be any interest in it. I had no motivation to waste hours coding a custom layout for something might only ever be read by a few people and then forgotten.<\/p>\n<p>Hardware manufacturers make hundreds of foam cutout prototypes of products before they build one with working buttons and screens. I'm aware of all the usability problems with a web page made of images, and equally, foam cutouts without buttons or screens aren't particularly user friendly either. They're not supposed to be.<\/p>\n<p>Let's move on.<\/p>\n<h5><em><strong>What? Why no comments? I need comments.<\/strong><\/em><\/h5>\n<p>Because comments add a layer of complexity that is beyond the core focus of this platform, which is publishing. Again, that's not to say you couldn't have any comments. This could easily be added with a dedicated plugin where you own the data or (as mentioned) there are third party providers such as Disqus, IntenseDebate, Livefyre and Facebook who all have great platforms. The point of this isn't to say \"you can't have comments\" - it's to say \"comments aren't on by default\". It's about simplicity, more than anything else.<\/p>\n<h5><em><strong>Yeah, but WordPress are already going to revise their dashboard, WordPress.com is experimenting with a potential simplified version... so why bother with this?<\/strong><\/em><\/h5>\n<p><a href=\"http:\/\/john.onolan.org\/wp-content\/uploads\/2012\/11\/newwp.png\" rel=\"lightbox[2102]\" title=\"newwp\" class=\"cboxElement\"><img class=\"alignnone size-large wp-image-2117\" title=\"newwp\" src=\"http:\/\/john.onolan.org\/wp-content\/uploads\/2012\/11\/newwp-550x210.png\" alt=\"\" width=\"550\" height=\"210\"><\/a><\/p>\n<p>Sorry, but Tumblr already did this - it's not the future of blogging, it's the past.<\/p>\n<p>Ghost isn't about sharing \"Fuck Yeah [<a href=\"http:\/\/fuckyeahdogs.tumblr.com\/\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/fuckyeahdogs.tumblr.com']);\">Dogs<\/a>\/<a href=\"http:\/\/fuckyeahsharks.tumblr.com\/\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/fuckyeahsharks.tumblr.com']);\" rel=\"lightbox\" class=\"cboxElement\">Sharks<\/a>\/<a href=\"http:\/\/fuckyeahgirlswithtattoos.tumblr.com\/\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/fuckyeahgirlswithtattoos.tumblr.com']);\">Girls with Tattoos<\/a>]\" - it's about publishing - which means writing - rather than mashing a few buttons to make sure that everyone can see and appreciate your latest funny picture\/status, which is surely the most funny picture\/status you've ever posted.<\/p>\n<p>Tumblr, Pinterest and Facebook already have this locked down.&nbsp;It's not the future.<\/p>\n<h5><em><strong>So... are you actually going to build this thing?<\/strong><\/em><\/h5>\n<p>The concept page was a way for me to test demand and interest. To see if anyone actually agreed with my frustrations and, more importantly, my solutions. I plucked a random figure of \"10,000 pageviews\" out of the air before I hit the publish button. If it got less than 10,000 pageviews, I would surrender to the fact that it would only ever be an idea. I've now exceeded that goal 9 times over, so yes, I'm looking at how Ghost can now be made into a reality.<\/p>\n<h5><em><strong>How can I find out when it's done? \/\/ SHUT UP AND TAKE MY MONEY<\/strong><\/em><\/h5>\n<p>Ok, ok - there's a holding page up on <a href=\"http:\/\/tryghost.org\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/tryghost.org']);\">http:\/\/TryGhost.org<\/a> - put your email address in.<\/p>\n<hr>\n<h3>How are you going to do this?<\/h3>\n<p>There's three main ways of going about this, each has merits as well as drawbacks.<\/p>\n<p><em><strong>1.) Build it from scratch<\/strong><\/em> - Many people (particularly the Hacker News crowd) expressed the sentiment that there was little point in forking WordPress. When you're going to strip out so much, you get to a point where you might as well start from scratch anyway. Take away the crutches of being stuck with older technologies and put together something which is as sophisticated in code as it is in UI\/UX.<\/p>\n<ul>\n<li><em>Pros:<\/em> The idea of something completely new is exciting, opportunity to build something very sophisticated, complete control over everything.<\/li>\n<li><em>Cons:<\/em> Lose the &nbsp;WordPress ecosystem which includes millions of users and thousands of developers, potentially spend the next 6 months fighting over whether to use PHP\/RoR\/Django\/Python\/Node\/Whateverthefuck because everyone loves to evangelise the technology they know best.<\/li>\n<\/ul>\n<p><em><strong>2.) Fork WordPress<\/strong><\/em> - This was the original idea I put out. Take the WordPress codebase, as is, and modify it to turn it into something new. Initially the codebase is practically the same, which means developers already know it. Then it can change over time and evolve into its own thing.<\/p>\n<ul>\n<li><em>Pros:<\/em> Easy start with existing codebase, potential to evolve, doesn't lose WordPress ecosystem initially.<\/li>\n<li><em>Cons:<\/em> Stuck with existing codebase - the good as well as the bad, &nbsp;eventually needs to be rewritten completely, less control, loses the WordPress ecosystem after a while anyway, makes it complicated to transition from legacy code to new code.<\/li>\n<\/ul>\n<p><em><strong>3.) Make it a plugin\/extension<\/strong><\/em> - Lots of people asked why Ghost couldn't just be a WordPress plugin. It would certainly be the easiest route of the 3, it's possible to completely remove \/wp-admin\/ and replace with with \/ghost\/ ... but I feel like it kind of misses the point. This route bolts Ghost on, but it's still WordPress under the hood. From a UI\/UX standpoint it would function - but it wouldn't revolutionise anything else. It makes WordPress itself about blogging again, rather than creating something new.<\/p>\n<ul>\n<li><em>Pros:<\/em> Very easy development, very easy deployment, keeps WordPress ecosystem forever, doesn't force anyone to change.<\/li>\n<li><em>Cons:<\/em> The least exciting (for me, personally), much less control, it would be much harder to maintain something like this on a non-profit basis - which loses a piece of what Ghost is about.<\/li>\n<\/ul>\n<h3>What's the answer?<\/h3>\n<p>I've spoken to a lot of smart people over the last few days. The one thing that everyone seems to agree on is that a fork is the worst of both worlds. So the one thing that I suggested as a way of making this happen, is the least likely to work in reality. Remember the foam prototype metaphor earlier? Learning and iterating - that's what happening now.<\/p>\n<p>That leaves a choice between WordPress plugin or fresh build. The answer? Both.<\/p>\n<p>A WordPress plugin will act as a proof of concept and a working prototype, initially, because it's easier to leverage the existing WordPress ecosystem to create it than to go into a cave for 6 months trying to build this amazing thing that everyone will have forgotten about.<\/p>\n<p>The plugin will not be perfect. It will add the Ghost UI\/UX and as much functionality as we can cram into it. It will completely remove \/wp-admin\/ and replace it with \/ghost\/ - effectively using WordPress core as a basic foundation to build on top of. It will give people who don't want to switch away from WordPress access to the Ghost UX which they want to have, and it will give people who want the full Ghost platform a taste of what's to come.<\/p>\n<p>It will allow us to develop and learn and iterate on the concept pretty rapidly, which has a great deal of value.<\/p>\n<p>This is step one. Assuming the plugin is actually used by people - it would then justify exploring building the standalone version of Ghost from the ground up. The plugin would subsequently serve as a great marketing tool for the platform. Think of it as an upgrade path. But that's a long way away. Having the idea is the easy part. Making it happen is what counts.<\/p>\n<p>Happily - amongst the thousands of people talking about Ghost for the last few days - several have been talking about how they've already built some working prototypes of my mockups and turned them into WordPress plugins or just local development sites. These will likely go on to be the starting point of the first Ghost plugin.<\/p>\n<p>There's a lot to do, and I'm amazed by the number of people who have offered their help with this. In the next few days I'll be kicking off work on the plugin properly and start putting together a more organised structure which explains how you can get involved and contribute to the project if you're interested. So... watch this space - and thanks for all your support so far.<\/p>\n<p><a href=\"http:\/\/twitter.com\/TryGhost\" onclick=\"javascript:_gaq.push(['_trackEvent','outbound-article','http:\/\/twitter.com']);\" class=\"twitter-follow-button\">Follow @TryGhost<\/a><\/p>",
            image: 'ghostpost.jpg',
            status: status,
            language: language
        });
    }

    function createUser(overrides) {
        return _.defaults(overrides, {
            uuid: uuid.v4(),
            status: 'active',
            created_by: 1,
            created_at: new Date()
        });
    }

    function createGenericUser(uniqueInteger) {
        return createUser({
            name: 'Joe Bloggs',
            slug: 'joe-blogs',
            email: 'joe_' + uniqueInteger + '@example.com',
            password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6'
        });
    }

    function createPostsTags(postId, tagId) {
        return {
            post_id: postId,
            tag_id: tagId
        };
    }

    function createAppField(overrides) {
        return _.defaults(overrides, {
            uuid: uuid.v4(),
            created_by: 1,
            created_at: new Date(),
            active: true,
            app_id: 1,
            relatable_id: 1,
            relatable_type: 'posts'
        });
    }

    function createAppSetting(overrides) {
        return _.defaults(overrides, {
            uuid: uuid.v4(),
            app_id: 1,
            created_by: 1,
            created_at: new Date()
        });
    }

    function createToken(overrides) {
        return _.defaults(overrides, {
            token: uuid.v4(),
            client_id: 1,
            expires: Date.now() + globalUtils.ONE_DAY_MS
        });
    }

    posts = [
        createPost(DataGenerator.Content.posts[0]),
        createPost(DataGenerator.Content.posts[1]),
        createPost(DataGenerator.Content.posts[2]),
        createPost(DataGenerator.Content.posts[3]),
        createPost(DataGenerator.Content.posts[4]),
        createPost(DataGenerator.Content.posts[5]),
        createPost(DataGenerator.Content.posts[6])
    ];

    tags = [
        createBasic(DataGenerator.Content.tags[0]),
        createBasic(DataGenerator.Content.tags[1]),
        createBasic(DataGenerator.Content.tags[2]),
        createBasic(DataGenerator.Content.tags[3]),
        createBasic(DataGenerator.Content.tags[4])
    ];

    roles = [
        createBasic(DataGenerator.Content.roles[0]),
        createBasic(DataGenerator.Content.roles[1]),
        createBasic(DataGenerator.Content.roles[2]),
        createBasic(DataGenerator.Content.roles[3])
    ];

    users = [
        createUser(DataGenerator.Content.users[0]),
        createUser(DataGenerator.Content.users[1]),
        createUser(DataGenerator.Content.users[2]),
        createUser(DataGenerator.Content.users[3])
    ];

    clients = [
        createBasic({name: 'Ghost Admin', slug: 'ghost-admin', secret: 'not_available', type: 'ua', status: 'enabled'})
    ];

    roles_users = [
        {user_id: 1, role_id: 4},
        {user_id: 2, role_id: 1},
        {user_id: 3, role_id: 2},
        {user_id: 4, role_id: 3}
    ];

    posts_tags = [
        {post_id: 1, tag_id: 1},
        {post_id: 1, tag_id: 2},
        {post_id: 2, tag_id: 1},
        {post_id: 2, tag_id: 2},
        {post_id: 3, tag_id: 3},
        {post_id: 4, tag_id: 4}
    ];

    apps = [
        createBasic(DataGenerator.Content.apps[0]),
        createBasic(DataGenerator.Content.apps[1]),
        createBasic(DataGenerator.Content.apps[2])
    ];

    app_fields = [
        createAppField(DataGenerator.Content.app_fields[0]),
        createAppField(DataGenerator.Content.app_fields[1])
    ];

    return {
        createPost: createPost,
        createGenericPost: createGenericPost,
        createTag: createBasic,
        createUser: createUser,
        createGenericUser: createGenericUser,
        createBasic: createBasic,
        createRole: createBasic,
        createPermission: createBasic,
        createPostsTags: createPostsTags,
        createApp: createBasic,
        createAppField: createAppField,
        createAppSetting: createAppSetting,
        createToken: createToken,

        posts: posts,
        tags: tags,
        posts_tags: posts_tags,
        apps: apps,
        app_fields: app_fields,
        roles: roles,
        users: users,
        roles_users: roles_users,
        clients: clients
    };
}());

DataGenerator.forModel = (function () {
    var posts,
        tags,
        users,
        roles;

    posts = _.map(DataGenerator.Content.posts, function (post) {
        return _.pick(post, 'title', 'markdown');
    });

    tags = DataGenerator.Content.tags;

    users = _.map(DataGenerator.Content.users, function (user) {
        user = _.pick(user, 'name', 'email');

        return _.defaults({
            password: 'Sl1m3rson'
        }, user);
    });

    roles = _.map(DataGenerator.Content.roles, function (role, id) {
        return _.extend({}, role, {id: id + 1});
    });

    return {
        posts: posts,
        tags: tags,
        users: users,
        roles: roles
    };
}());

module.exports = DataGenerator;
