var uuid = require('node-uuid');

/*global module */
module.exports = {
    posts: [
        {
            "uuid":             uuid.v4(),
            "title":            "Getting Started With Ghost",
            "slug":             "getting-started-with-ghost",
            "content":          "This short guide will teach you how to get Ghost up and running on your computer. It doesn’t cover deploying it to a live server, just getting it running on your machine so that you can use it, and develop on top of it.\n\n### Instructions\n\n1. Once you’ve downloaded one of the release packages, unzip it, and place the directory wherever you would like to run the code.\n2. Fire up your command line and do shit.\n3. ???\n4. Profit\n\n### Logging in For The First Time\n\nOnce you have the Ghost server up and running, you should be able to navigate to `http://localhost:3333` from a web browser, where you will be prompted for a login.\n\n1. Click on the “register new user” link\n2. Enter your user details\n3. Return to the login screen and use those details to log in.\n\n### Finding Your Way Around Ghost\n\nYou should now be logged in and up and running with the very first, very earliest, most historically significant, most prototypal, version of the Ghost blogging platform. Click around the dashboard. You will find that most things work, but many things do not. We’re still working on those. Keep downloading the new packages as we release them, and you should hopefully see big changes between each version as we go!",
            "content_html":     "<p>This short guide will teach you how to get Ghost up and running on your computer. It doesn’t cover deploying it to a live server, just getting it running on your machine so that you can use it, and develop on top of it.</p>\n\n<h3 id=\"instructions\">Instructions</h3>\n\n<ol>\n<li>Once you’ve downloaded one of the release packages, unzip it, and place the directory wherever you would like to run the code.</li>\n<li>Fire up your command line and do shit.</li>\n<li>???</li>\n<li>Profit</li>\n</ol>\n\n<h3 id=\"logginginforthefirsttime\">Logging in For The First Time</h3>\n\n<p>Once you have the Ghost server up and running, you should be able to navigate to <code>http://localhost:3333</code> from a web browser, where you will be prompted for a login.</p>\n\n<ol>\n<li>Click on the “register new user” link</li>\n<li>Enter your user details</li>\n<li>Return to the login screen and use those details to log in.</li>\n</ol>\n\n<h3 id=\"findingyourwayaroundghost\">Finding Your Way Around Ghost</h3>\n\n<p>You should now be logged in and up and running with the very first, very earliest, most historically significant, most prototypal, version of the Ghost blogging platform. Click around the dashboard. You will find that most things work, but many things do not. We’re still working on those. Keep downloading the new packages as we release them, and you should hopefully see big changes between each version as we go!</p>",
            "meta_title":       "Getting Started",
            "meta_description": null,
            "meta_keywords":    null,
            "featured":         1,
            "image":            null,
            "status":           "published",
            "language":         "en",
            "author_id":        1,
            "created_at":       1373017238861,
            "created_by":       1,
            "updated_at":       null,
            "updated_by":       null,
            "published_at":     1373017238870,
            "published_by":     1
        }
    ],

    settings: [
        {
            "uuid":         uuid.v4(),
            "key":          "url",
            "value":        "http://localhost:3333",
            "created_by":    1,
            "updated_by":    1,
            "type":         "blog"
        },
        {
            "uuid":         uuid.v4(),
            "key":          "title",
            "value":        "John O'Nolan",
            "created_by":    1,
            "updated_by":    1,
            "type":         "blog"
        },
        {
            "uuid":         uuid.v4(),
            "key":          "description",
            "value":        "Interactive designer, public speaker, startup advisor and writer. Living in Austria, attempting world domination via keyboard.",
            "created_by":    1,
            "updated_by":    1,
            "type":         "blog"
        },
        {
            "uuid":         uuid.v4(),
            "key":          "email",
            "value":        "john@onolan.org",
            "created_by":    1,
            "updated_by":    1,
            "type":         "general"
        },
        {
            "uuid":         uuid.v4(),
            "key":          "activePlugins",
            "value":        "",
            "created_by":    1,
            "updated_by":    1,
            "type":         "general"
        },
        {
            "uuid":         uuid.v4(),
            "key":          "activeTheme",
            "value":        "content/themes/casper",
            "created_by":    1,
            "updated_by":    1,
            "type":         "general"
        },
        {
            "uuid":         uuid.v4(),
            "key":          "currentVersion",
            "value":        "001",
            "created_by":    1,
            "updated_by":    1,
            "type":         "core"
        }
    ],

    roles: [
        {
            "id": 1,
            "name": "Administrator",
            "description": "Administrators"
        },
        {
            "id": 2,
            "name": "Editor",
            "description": "Editors"
        },
        {
            "id": 3,
            "name": "Author",
            "description": "Authors"
        }
    ],

    permissions: [
        {
            "id": 1,
            "name": "Edit posts",
            "action_type": "edit",
            "object_type": "post"
        },
        {
            "id": 2,
            "name": "Remove posts",
            "action_type": "remove",
            "object_type": "post"
        },
        {
            "id": 3,
            "name": "Create posts",
            "action_type": "create",
            "object_type": "post"
        }
    ],

    permissions_roles: [
        {
            "id": 1,
            "permission_id": 1,
            "role_id": 1
        },
        {
            "id": 2,
            "permission_id": 2,
            "role_id": 1
        },
        {
            "id": 3,
            "permission_id": 3,
            "role_id": 1
        }
    ]
};