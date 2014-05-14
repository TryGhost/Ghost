var sequence    = require('when/sequence'),
    _           = require('lodash'),
    Post        = require('../../models/post').Post,
    Tag         = require('../../models/tag').Tag,
    Role        = require('../../models/role').Role,
    Permission  = require('../../models/permission').Permission,
    Permissions = require('../../models/permission').Permissions,

    populateFixtures,
    updateFixtures;

var fixtures = {
    posts: [
        {
            "title":            "Welcome to Ghost",
            "slug":             "welcome-to-ghost",
            "markdown":         "You're live! Nice. We've put together a little post to introduce you to the Ghost editor and get you started. You can manage your content by signing in to the admin area at `<your blog URL>/ghost/`. When you arrive, you can select this post from a list on the left and see a preview of it on the right. Click the little pencil icon at the top of the preview to edit this post and read the next section!\n\n## Getting Started\n\nGhost uses something called Markdown for writing. Essentially, it's a shorthand way to manage your post formatting as you write!\n\nWriting in Markdown is really easy. In the left hand panel of Ghost, you simply write as you normally would. Where appropriate, you can use *shortcuts* to **style** your content. For example, a list:\n\n* Item number one\n* Item number two\n    * A nested item\n* A final item\n\nor with numbers!\n\n1. Remember to buy some milk\n2. Drink the milk\n3. Tweet that I remembered to buy the milk, and drank it\n\n### Links\n\nWant to link to a source? No problem. If you paste in url, like http://ghost.org - it'll automatically be linked up. But if you want to customise your anchor text, you can do that too! Here's a link to [the Ghost website](http://ghost.org). Neat.\n\n### What about Images?\n\nImages work too! Already know the URL of the image you want to include in your article? Simply paste it in like this to make it show up:\n\n![The Ghost Logo](https://ghost.org/images/ghost.png)\n\nNot sure which image you want to use yet? That's ok too. Leave yourself a descriptive placeholder and keep writing. Come back later and drag and drop the image in to upload:\n\n![A bowl of bananas]\n\n\n### Quoting\n\nSometimes a link isn't enough, you want to quote someone on what they've said. It was probably very wisdomous. Is wisdomous a word? Find out in a future release when we introduce spellcheck! For now - it's definitely a word.\n\n> Wisdomous - it's definitely a word.\n\n### Working with Code\n\nGot a streak of geek? We've got you covered there, too. You can write inline `<code>` blocks really easily with back ticks. Want to show off something more comprehensive? 4 spaces of indentation gets you there.\n\n    .awesome-thing {\n        display: block;\n        width: 100%;\n    }\n\n### Ready for a Break? \n\nThrow 3 or more dashes down on any new line and you've got yourself a fancy new divider. Aw yeah.\n\n---\n\n### Advanced Usage\n\nThere's one fantastic secret about Markdown. If you want, you can  write plain old HTML and it'll still work! Very flexible.\n\n<input type=\"text\" placeholder=\"I'm an input field!\" />\n\nThat should be enough to get you started. Have fun - and let us know what you think :)",
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
    ],

    permissions003: [
        {
            "name":             "Get slug",
            "action_type":      "slug",
            "object_type":      "post"
        },
        {
            "name":             "Export database",
            "action_type":      "exportContent",
            "object_type":      "db"
        },
        {
            "name":             "Import database",
            "action_type":      "importContent",
            "object_type":      "db"
        },
        {
            "name":             "Delete all content",
            "action_type":      "deleteAllContent",
            "object_type":      "db"
        },
        {
            "name":             "Browse users",
            "action_type":      "browse",
            "object_type":      "user"
        },
        {
            "name":             "Read users",
            "action_type":      "read",
            "object_type":      "user"
        },
        {
            "name":             "Edit users",
            "action_type":      "edit",
            "object_type":      "user"
        },
        {
            "name":             "Add users",
            "action_type":      "add",
            "object_type":      "user"
        },
        {
            "name":             "Browse settings",
            "action_type":      "browse",
            "object_type":      "setting"
        },
        {
            "name":             "Read settings",
            "action_type":      "read",
            "object_type":      "setting"
        },
        {
            "name":             "Edit settings",
            "action_type":      "edit",
            "object_type":      "setting"
        },
        {
            "name":             "Browse themes",
            "action_type":      "browse",
            "object_type":      "theme"
        },
        {
            "name":             "Edit themes",
            "action_type":      "edit",
            "object_type":      "theme"
        }
    ]
};

populateFixtures = function () {
    var ops = [],
        relations = [];

    _.each(fixtures.posts, function (post) {
        ops.push(function () {return Post.add(post, {user: 1}); });
    });

    _.each(fixtures.tags, function (tag) {
        ops.push(function () {return Tag.add(tag, {user: 1}); });
    });

    _.each(fixtures.roles, function (role) {
        ops.push(function () {return Role.add(role, {user: 1}); });
    });

    _.each(fixtures.permissions, function (permission) {
        ops.push(function () {return Permission.add(permission, {user: 1}); });
    });

    _.each(fixtures.permissions003, function (permission) {
        ops.push(function () {return Permission.add(permission, {user: 1}); });
    });

    // add the tag to the post
    relations.push(function () {
        Post.forge({id: 1}).fetch({withRelated: ['tags']}).then(function (post) {
            post.tags().attach([1]);
        });
    });

    //grant permissions to roles
    relations.push(function () {
        // admins gets all permissions
        Role.forge({name: 'Administrator'}).fetch({withRelated: ['permissions']}).then(function (role) {
            Permissions.forge().fetch().then(function (perms) {
                var admin_perm = _.map(perms.toJSON(), function (perm) {
                    return perm.id;
                });
                return role.permissions().attach(_.compact(admin_perm));
            });
        });

        // editor gets access to posts, users and settings.browse, settings.read
        Role.forge({name: 'Editor'}).fetch({withRelated: ['permissions']}).then(function (role) {
            Permissions.forge().fetch().then(function (perms) {
                var editor_perm = _.map(perms.toJSON(), function (perm) {
                    if (perm.object_type === 'post' || perm.object_type === 'user') {
                        return perm.id;
                    }
                    if (perm.object_type === 'setting' &&
                            (perm.action_type === 'browse' || perm.action_type === 'read')) {
                        return perm.id;
                    }
                    return null;
                });
                return role.permissions().attach(_.compact(editor_perm));
            });
        });

        // author gets access to post.add, post.slug, settings.browse, settings.read, users.browse and users.read
        Role.forge({name: 'Author'}).fetch({withRelated: ['permissions']}).then(function (role) {
            Permissions.forge().fetch().then(function (perms) {
                var author_perm = _.map(perms.toJSON(), function (perm) {
                    if (perm.object_type === 'post' &&
                            (perm.action_type === 'add' || perm.action_type === 'slug')) {
                        return perm.id;
                    }
                    if (perm.object_type === 'setting' &&
                            (perm.action_type === 'browse' || perm.action_type === 'read')) {
                        return perm.id;
                    }
                    if (perm.object_type === 'user' &&
                            (perm.action_type === 'browse' || perm.action_type === 'read')) {
                        return perm.id;
                    }
                    return null;
                });
                return role.permissions().attach(_.compact(author_perm));
            });
        });
    });

    return sequence(ops).then(function () {
        sequence(relations);
    });
};

updateFixtures = function () {
    var ops = [],
        relations = [];

    _.each(fixtures.permissions003, function (permission) {
        ops.push(function () {return Permission.add(permission, {user: 1}); });
    });

    relations.push(function () {
        // admin gets all new permissions
        Role.forge({name: 'Administrator'}).fetch({withRelated: ['permissions']}).then(function (role) {
            Permissions.forge().fetch().then(function (perms) {
                var admin_perm = _.map(perms.toJSON(), function (perm) {
                    var result  = fixtures.permissions003.filter(function (object) {
                        return object.object_type === perm.object_type && object.action_type === perm.action_type;
                    });
                    if (!_.isEmpty(result)) {
                        return perm.id;
                    }
                    return null;
                });
                return role.permissions().attach(_.compact(admin_perm));
            });
        });

        // editor gets access to posts, users and settings.browse, settings.read
        Role.forge({name: 'Editor'}).fetch({withRelated: ['permissions']}).then(function (role) {
            Permissions.forge().fetch().then(function (perms) {
                var editor_perm = _.map(perms.toJSON(), function (perm) {
                    if (perm.object_type === 'post' || perm.object_type === 'user') {
                        return perm.id;
                    }
                    if (perm.object_type === 'setting' &&
                            (perm.action_type === 'browse' || perm.action_type === 'read')) {
                        return perm.id;
                    }
                    return null;
                });
                return role.permissions().attach(_.compact(editor_perm));
            });
        });

        // author gets access to post.add, post.slug, settings.browse, settings.read, users.browse and users.read
        Role.forge({name: 'Author'}).fetch({withRelated: ['permissions']}).then(function (role) {
            Permissions.forge().fetch().then(function (perms) {
                var author_perm = _.map(perms.toJSON(), function (perm) {
                    if (perm.object_type === 'post' &&
                            (perm.action_type === 'add' || perm.action_type === 'slug')) {
                        return perm.id;
                    }
                    if (perm.object_type === 'setting' &&
                            (perm.action_type === 'browse' || perm.action_type === 'read')) {
                        return perm.id;
                    }
                    if (perm.object_type === 'user' &&
                            (perm.action_type === 'browse' || perm.action_type === 'read')) {
                        return perm.id;
                    }
                    return null;
                });
                return role.permissions().attach(_.compact(author_perm));
            });
        });
    });

    return sequence(ops).then(function () {
        sequence(relations);
    });
};

module.exports = {
    populateFixtures: populateFixtures,
    updateFixtures: updateFixtures
};
