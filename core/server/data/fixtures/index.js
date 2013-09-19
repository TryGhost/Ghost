var sequence    = require('when/sequence'),
    _ = require('underscore'),
    Post = require('../../models/post').Post,
    Tag = require('../../models/tag').Tag,
    Role = require('../../models/role').Role,
    Permission = require('../../models/permission').Permission,
    uuid = require('node-uuid');

var fixtures = {
    posts: [
        {
            "title":            "Welcome to Ghost",
            "slug":             "welcome-to-ghost",
            "markdown":         "You're in! Nice. We've put together a little post to introduce you to the Ghost editor and get you started. Go ahead and edit this post to get going and learn how it all works!\n\n## Getting Started\n\nWriting in markdown is really easy. In the left hand panel of Ghost, you simply write as you normally would. Where appropriate, you can use *formatting* shortcuts to style your content. For example, a list:\n\n* Item number one\n* Item number two\n    * A nested item\n* A final item\n\nor with numbers!\n\n1. Remember to buy some milk\n2. Drink the milk\n3. Tweet that I remembered to buy the milk, and drank it\n\n### Links\n\nWant to link to a source? No problem. If you paste in url, like http://ghost.org - it'll automatically be linked up. But if you want to customise your anchor text, you can do that too! Here's a link to [the Ghost website](http://ghost.org). Neat.\n\n### What about Images?\n\nImages work too! Already know the URL of the image you want to include in your article? Simply paste it in like this to make it show up:\n\n![The Ghost Logo](http://tryghost.org/ghost.png)\n\nNot sure which image you want to use yet? That's ok too. Leave yourself a descriptive placeholder and keep writing. Come back later and drag and drop the image in to upload:\n\n![A bowl of bananas]\n\n\n### Quoting\n\nSometimes a link isn't enough, you want to quote someone on what they've said. It was probably very wisdomous. Is wisdomous a word? Find out in a future release when we introduce spellcheck! For now - it's definitely a word.\n\n> Wisdomous - it's definitely a word.\n\n### Working with Code\n\nGot a streak of geek? We've got you covered there, too. You can write inline `<code>` blocks really easily with back ticks. Want to show off something more comprehensive? 4 spaces of indentation gets you there.\n\n    .awesome-thing {\n        display: block;\n        width: 100%;\n    }\n\n### Ready for a Break? \n\nThrow 3 or more dashes down on any new line and you've got yourself a fancy new divider. Aw yeah.\n\n---\n\n### Advanced Usage\n\nThere's one fantastic secret about Markdown. If you want, you can  write plain old HTML and it'll still work! Very flexible.\n\n<input type=\"text\" placeholder=\"I'm an input field!\" />\n\nThat should be enough to get you started. Have fun - and let us know what you think :)",
            "html":             "<p>You're in! Nice. We've put together a little post to introduce you to the Ghost editor and get you started. Go ahead and edit this post to get going and learn how it all works!</p>\n\n<h2 id=\"gettingstarted\">Getting Started</h2>\n\n<p>Writing in markdown is really easy. In the left hand panel of Ghost, you simply write as you normally would. Where appropriate, you can use <em>formatting</em> shortcuts to style your content. For example, a list:</p>\n\n<ul>\n<li>Item number one</li>\n<li>Item number two\n<ul><li>A nested item</li></ul></li>\n<li>A final item</li>\n</ul>\n\n<p>or with numbers!</p>\n\n<ol>\n<li>Remember to buy some milk  </li>\n<li>Drink the milk  </li>\n<li>Tweet that I remembered to buy the milk, and drank it</li>\n</ol>\n\n<h3 id=\"links\">Links</h3>\n\n<p>Want to link to a source? No problem. If you paste in url, like <a href='http://ghost.org'>http://ghost.org</a> - it'll automatically be linked up. But if you want to customise your anchor text, you can do that too! Here's a link to <a href=\"http://ghost.org\">the Ghost website</a>. Neat.</p>\n\n<h3 id=\"whataboutimages\">What about Images?</h3>\n\n<p>Images work too! Already know the URL of the image you want to include in your article? Simply paste it in like this to make it show up:</p>\n\n<p><img src=\"http://tryghost.org/ghost.png\" alt=\"The Ghost Logo\" /></p>\n\n<p>Not sure which image you want to use yet? That's ok too. Leave yourself a descriptive placeholder and keep writing. Come back later and drag and drop the image in to upload:</p>\n\n<p><img src=\"undefined\" alt=\"A bowl of bananas\" /></p>\n\n<h3 id=\"quoting\">Quoting</h3>\n\n<p>Sometimes a link isn't enough, you want to quote someone on what they've said. It was probably very wisdomous. Is wisdomous a word? Find out in a future release when we introduce spellcheck! For now - it's definitely a word.</p>\n\n<blockquote>\n  <p>Wisdomous - it's definitely a word.</p>\n</blockquote>\n\n<h3 id=\"workingwithcode\">Working with Code</h3>\n\n<p>Got a streak of geek? We've got you covered there, too. You can write inline <code>&lt;code&gt;</code> blocks really easily with back ticks. Want to show off something more comprehensive? 4 spaces of indentation gets you there.</p>\n\n<pre><code>.awesome-thing {\n    display: block;\n    width: 100%;\n}\n</code></pre>\n\n<h3 id=\"readyforabreak\">Ready for a Break?</h3>\n\n<p>Throw 3 or more dashes down on any new line and you've got yourself a fancy new divider. Aw yeah.</p>\n\n<hr />\n\n<h3 id=\"advancedusage\">Advanced Usage</h3>\n\n<p>There's one fantastic secret about Markdown. If you want, you can  write plain old HTML and it'll still work! Very flexible.</p>\n\n<p><input type=\"text\" placeholder=\"I'm an input field!\" /></p>\n\n<p>That should be enough to get you started. Have fun - and let us know what you think :)</p>",
            "image":            null,
            "featured":         false,
            "page":             false,
            "status":           "published",
            "language":         "en_US",
            "meta_title":       null,
            "meta_description": null
        }
    ],

    tags: [
        {
            "name":             "Getting Started",
            "slug":             "getting-started",
            "description":      null,
            "parent_id":        null,
            "meta_title":       null,
            "meta_description": null
        }
    ],

    roles: [
        {
            "name":             "Administrator",
            "description":      "Administrators"
        },
        {
            "name":             "Editor",
            "description":      "Editors"
        },
        {
            "name":             "Author",
            "description":      "Authors"
        }
    ],

    permissions: [
        {
            "name":             "Edit posts",
            "action_type":      "edit",
            "object_type":      "post"
        },
        {
            "name":             "Remove posts",
            "action_type":      "remove",
            "object_type":      "post"
        },
        {
            "name":             "Create posts",
            "action_type":      "create",
            "object_type":      "post"
        }
    ]
};

module.exports = {
    populateFixtures: function () {
        var ops = [];

        _.each(fixtures.posts, function (post) {
            ops.push(function () {return Post.add(post); });
        });

        _.each(fixtures.tags, function (tag) {
            ops.push(function () {return Tag.add(tag); });
        });

        _.each(fixtures.roles, function (role) {
            ops.push(function () {return Role.add(role); });
        });
        _.each(fixtures.permissions, function (permission) {
            ops.push(function () {return Permission.add(permission); });
        });

        // add the tag to the post
        ops.push(function () {
            Post.forge({id: 1}).fetch({withRelated: ['tags']}).then(function (post) {
                post.tags().attach([1]);
            });
        });

        // finally, grant admins all permissions
        ops.push(function () {
            Role.forge({id: 1}).fetch({withRelated: ['permissions']}).then(function (role) {
                role.permissions().attach([1, 2, 3]);
            });
        });

        return sequence(ops);
    }
};