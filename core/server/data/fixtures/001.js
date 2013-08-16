var uuid = require('node-uuid');

module.exports = {
    posts: [
        {
            "uuid":             uuid.v4(),
            "title":            "Welcome to Ghost",
            "slug":             "welcome-to-ghost",
            "content_raw":      "This short guide will teach you how to get Ghost up and running on your computer. It doesn't cover deploying it to a live server, just getting it running on your machine so that you can use it, and develop on top of it.\n\n## Setup Instructions\n\n### Compatibility Notes\n\nGhost uses SQLite which must be built natively on the operating system you intend to run Ghost on. We are working to improve this process, but in the meantime the following OS compatibility notes apply:\n\n*   **Linux** - Ghost should install and run with no problems\n*   **Mac** - you may require Xcode (free) and the CLI Tools which can be installed from Xcode to get Ghost installed\n*   **Windows** - Ghost will and does install and run (really well actually) on Windows, but there are a set of pre-requisites which are tricky to install. Detailed instructions for this are coming very soon.\n\n### Pre-requisites\n\nGhost requires [node][1] 0.10.* or 0.11.* and npm. Download and install from [nodejs.org][1]\n\n### Installing\n\n1.  Once you've downloaded one of the release packages, unzip it, and place the directory wherever you would like to run the code\n2.  Fire up a terminal (or node command prompt in Windows) and change directory to the root of the Ghost application (where config.js and index.js are)\n3.  run `npm install` to install the node dependencies (if you get errors to do with SQLite, please see the compatibility notes)\n4.  To start ghost, run `npm start`\n5.  Visit [http://localhost:2368/](http://localhost:2368/) in your web browser\n\n## Logging in For The First Time\n\nOnce you have the Ghost server up and running, you should be able to navigate to [http://localhost:2368/ghost](http://localhost:2368/ghost) from a web browser, where you will be prompted for a login.\n\n1.  Click on the \"register new user\" link\n2.  Enter your user details (careful here: There is no password reset yet!)\n3.  Return to the login screen and use those details to log in.\n\n## Finding Your Way Around Ghost\n\nYou should now be logged in and up and running with the very first, very earliest, most historically significant, most prototypal version of the Ghost blogging platform. Click around the dashboard. You will find that most things work, but many things do not. We're still working on those. Keep downloading the new packages as we release them, and you should hopefully see big changes between each version as we go!\n\n [1]: http://nodejs.org/",
            "content":          "<p>This short guide will teach you how to get Ghost up and running on your computer. It doesn't cover deploying it to a live server, just getting it running on your machine so that you can use it, and develop on top of it.</p>\n\n<h2 id=\"setupinstructions\">Setup Instructions</h2>\n\n<h3 id=\"compatibilitynotes\">Compatibility Notes</h3>\n\n<p>Ghost uses SQLite which must be built natively on the operating system you intend to run Ghost on. We are working to improve this process, but in the meantime the following OS compatibility notes apply:</p>\n\n<ul>\n<li><strong>Linux</strong> - Ghost should install and run with no problems</li>\n<li><strong>Mac</strong> - you may require Xcode (free) and the CLI Tools which can be installed from Xcode to get Ghost installed</li>\n<li><strong>Windows</strong> - Ghost will and does install and run (really well actually) on Windows, but there are a set of pre-requisites which are tricky to install. Detailed instructions for this are coming very soon.</li>\n</ul>\n\n<h3 id=\"prerequisites\">Pre-requisites</h3>\n\n<p>Ghost requires <a href=\"http://nodejs.org/\">node</a> 0.10.* or 0.11.* and npm. Download and install from <a href=\"http://nodejs.org/\">nodejs.org</a></p>\n\n<h3 id=\"installing\">Installing</h3>\n\n<ol>\n<li>Once you've downloaded one of the release packages, unzip it, and place the directory wherever you would like to run the code</li>\n<li>Fire up a terminal (or node command prompt in Windows) and change directory to the root of the Ghost application (where config.js and index.js are)</li>\n<li>run <code>npm install</code> to install the node dependencies (if you get errors to do with SQLite, please see the compatibility notes)</li>\n<li>To start ghost, run <code>npm start</code></li>\n<li>Visit <a href=\"http://localhost:2368/\">http://localhost:2368/</a> in your web browser</li>\n</ol>\n\n<h2 id=\"logginginforthefirsttime\">Logging in For The First Time</h2>\n\n<p>Once you have the Ghost server up and running, you should be able to navigate to <a href=\"http://localhost:2368/ghost\">http://localhost:2368/ghost</a> from a web browser, where you will be prompted for a login.</p>\n\n<ol>\n<li>Click on the \"register new user\" link</li>\n<li>Enter your user details (careful here: There is no password reset yet!)</li>\n<li>Return to the login screen and use those details to log in.</li>\n</ol>\n\n<h2 id=\"findingyourwayaroundghost\">Finding Your Way Around Ghost</h2>\n\n<p>You should now be logged in and up and running with the very first, very earliest, most historically significant, most prototypal version of the Ghost blogging platform. Click around the dashboard. You will find that most things work, but many things do not. We're still working on those. Keep downloading the new packages as we release them, and you should hopefully see big changes between each version as we go!</p>",
            "meta_title":       null,
            "meta_description": null,
            "meta_keywords":    null,
            "featured":         true,
            "image":            null,
            "status":           "published",
            "language":         "en",
            "author_id":        1,
            "created_at":       1373578890610,
            "created_by":       1,
            "updated_at":       1373578997173,
            "updated_by":       1,
            "published_at":     1373578895817,
            "published_by":     1
        }
    ],

    settings: [
        {
            "uuid":         uuid.v4(),
            "key":          "url",
            "value":        "http://localhost:2368",
            "created_by":    1,
            "updated_by":    1,
            "type":         "blog"
        },
        {
            "uuid":         uuid.v4(),
            "key":          "title",
            "value":        "Ghost",
            "created_by":    1,
            "updated_by":    1,
            "type":         "blog"
        },
        {
            "uuid":         uuid.v4(),
            "key":          "description",
            "value":        "Just a blogging platform.",
            "created_by":    1,
            "updated_by":    1,
            "type":         "blog"
        },
        {
            "uuid":         uuid.v4(),
            "key":          "email",
            "value":        "ghost@example.com",
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