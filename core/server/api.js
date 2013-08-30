// # Ghost Data API
// Provides access to the data model

var Ghost = require('../ghost'),
    _ = require('underscore'),
    when = require('when'),
    errors = require('./errorHandling'),
    permissions = require('./permissions'),
    canThis = permissions.canThis,

    ghost = new Ghost(),
    dataProvider = ghost.dataProvider,
    posts,
    users,
    notifications,
    settings,
    themes,
    requestHandler,
    cachedSettingsRequestHandler,
    settingsObject,
    settingsCollection;

// ## Posts
posts = {
    // #### Browse

    // **takes:** filter / pagination parameters
    browse: function browse(options) {
        // **returns:** a promise for a page of posts in a json object
        return dataProvider.Post.findPage(options);
    },

    // #### Read

    // **takes:** an identifier (id or slug?)
    read: function read(args) {
        // **returns:** a promise for a single post in a json object
        return dataProvider.Post.findOne(args);
    },

    // #### Edit

    // **takes:** a json object with all the properties which should be updated
    edit: function edit(postData) {
        // **returns:** a promise for the resulting post in a json object
        if (!this.user) {
            return when.reject("You do not have permission to edit this post.");
        }

        return canThis(this.user).edit.post(postData.id).then(function () {
            return dataProvider.Post.edit(postData);
        }, function () {
            return when.reject("You do not have permission to edit this post.");
        });
    },

    // #### Add

    // **takes:** a json object representing a post,
    add: function add(postData) {
        // **returns:** a promise for the resulting post in a json object
        if (!this.user) {
            return when.reject("You do not have permission to add posts.");
        }

        return canThis(this.user).create.post().then(function () {
            return dataProvider.Post.add(postData);
        }, function () {
            return when.reject("You do not have permission to add posts.");
        });
    },

    // #### Destroy

    // **takes:** an identifier (id or slug?)
    destroy: function destroy(args) {
        // **returns:** a promise for a json response with the id of the deleted post
        if (!this.user) {
            return when.reject("You do not have permission to remove posts.");
        }

        return canThis(this.user).remove.post(args.id).then(function () {
            return dataProvider.Post.destroy(args.id);
        }, function () {
            return when.reject("You do not have permission to remove posts.");
        });
    }
};

// ## Users
users = {
    // #### Browse

    // **takes:** options object
    browse: function browse(options) {
        // **returns:** a promise for a collection of users in a json object
        return dataProvider.User.browse(options);
    },

    // #### Read

    // **takes:** an identifier (id or slug?)
    read: function read(args) {
        // **returns:** a promise for a single user in a json object
        if (args.id === 'me') {
            args = {id: this.user};
        }

        return dataProvider.User.read(args);
    },

    // #### Edit

    // **takes:** a json object representing a user
    edit: function edit(userData) {
        // **returns:** a promise for the resulting user in a json object
        userData.id = this.user;
        return dataProvider.User.edit(userData);
    },

    // #### Add

    // **takes:** a json object representing a user
    add: function add(userData) {

        // **returns:** a promise for the resulting user in a json object
        return dataProvider.User.add(userData);
    },

    // #### Check
    // Checks a password matches the given email address

    // **takes:** a json object representing a user
    check: function check(userData) {
        // **returns:** on success, returns a promise for the resulting user in a json object
        return dataProvider.User.check(userData);
    },

    // #### Change Password

    // **takes:** a json object representing a user
    changePassword: function changePassword(userData) {
        // **returns:** on success, returns a promise for the resulting user in a json object
        return dataProvider.User.changePassword(userData);
    }
};

// ## Notifications
notifications = {
    // #### Destroy

    // **takes:** an identifier (id)
    destroy: function destroy(i) {
        ghost.notifications = _.reject(ghost.notifications, function (element) {
            return element.id === i.id;
        });
        // **returns:** a promise for remaining notifications as a json object
        return when(ghost.notifications);
    },

    // #### Add

    // **takes:** a notification object of the form
    // ```
    //  msg = {
    //      type: 'error', // this can be 'error', 'success', 'warn' and 'info'
    //      message: 'This is an error', // A string. Should fit in one line.
    //      status: 'persistent', // or 'passive'
    //      id: 'auniqueid' // A unique ID
    //  };
    // ```
    add: function add(notification) {
        // **returns:** a promise for all notifications as a json object
        return when(ghost.notifications.push(notification));
    }
};

// ## Settings

// ### Helpers
// Turn a settings collection into a single object/hashmap
settingsObject = function (settings) {
    return (settings.toJSON ? settings.toJSON() : settings).reduce(function (res, item) {
        if (item.toJSON) { item = item.toJSON(); }
        if (item.key) { res[item.key] = item.value; }
        return res;
    }, {});
};
// Turn an object into a collection
settingsCollection = function (settings) {
    return _.map(settings, function (value, key) {
        return { key: key, value: value };
    });
};

settings = {
    // #### Browse

    // **takes:** options object
    browse: function browse(options) {
         // **returns:** a promise for a settings json object
        return dataProvider.Settings.browse(options).then(settingsObject, errors.logAndThrowError);
    },

    // #### Read

    // **takes:** either a json object containing a key, or a single key string
    read: function read(options) {
        if (_.isString(options)) {
            options = { key: options };
        }

        // **returns:** a promise for a single key-value pair
        return dataProvider.Settings.read(options.key).then(function (setting) {
            if (!setting) {
                return when.reject("Unable to find setting: " + options.key);
            }

            return _.pick(setting.toJSON(), 'key', 'value');
        }, errors.logAndThrowError);
    },

    // #### Edit

     // **takes:** either a json object representing a collection of settings, or a key and value pair
    edit: function edit(key, value) {
        // Check for passing a collection of settings first
        if (_.isObject(key)) {
            key = settingsCollection(key);

            return dataProvider.Settings.edit(key).then(settingsObject, errors.logAndThrowError);
        }

         // **returns:** a promise for a settings json object
        return dataProvider.Settings.read(key).then(function (setting) {
            if (!setting) {
                return when.reject("Unable to find setting: " + key);
            }

            if (!_.isString(value)) {
                value = JSON.stringify(value);
            }

            setting.set('value', value);

            return dataProvider.Settings.edit(setting);
        }, errors.logAndThrowError);
    }
};

// ## Themes

themes = {
    // #### Browse

    // **takes:** options object
    browse: function browse() {
         // **returns:** a promise for a themes json object
        return when(ghost.paths().availableThemes).then(function (themes) {
            var themeKeys = Object.keys(themes),
                res = [],
                i,
                activeTheme = ghost.paths().activeTheme.substring(ghost.paths().activeTheme.lastIndexOf('/') + 1),
                item;

            for (i = 0; i < themeKeys.length; i += 1) {
                //do not include hidden files
                if (themeKeys[i].indexOf('.') !== 0) {
                    item = {};
                    item.name = themeKeys[i];
                    item.details = themes[themeKeys[i]];
                    if (themeKeys[i] === activeTheme) {
                        item.active = true;
                    }
                    res.push(item);
                }
            }
            return res;
        });
    }
};

// ## Request Handlers

// ### requestHandler
// decorator for api functions which are called via an HTTP request
// takes the API method and wraps it so that it gets data from the request and returns a sensible JSON response
requestHandler = function (apiMethod) {
    return function (req, res) {
        var options = _.extend(req.body, req.query, req.params),
            apiContext = {
                user: req.session && req.session.user
            };

        return apiMethod.call(apiContext, options).then(function (result) {
            res.json(result || {});
        }, function (error) {
            error = {error: _.isString(error) ? error : (_.isObject(error) ? error.message : 'Unknown API Error')};
            res.json(400, error);
        });
    };
};

// ### cachedSettingsRequestHandler
// Special request handler for settings to access the internal cache version of the settings object
cachedSettingsRequestHandler = function (apiMethod) {
    if (!ghost.settings()) {
        return requestHandler(apiMethod);
    }

    return function (req, res) {
        var options = _.extend(req.body, req.query, req.params),
            promise;

        switch (apiMethod.name) {
        case 'browse':
            promise = when(ghost.settings());
            break;
        case 'read':
            promise = when(ghost.settings()[options.key]);
            break;
        case 'edit':
            promise = apiMethod(options).then(function (result) {
                ghost.updateSettingsCache(result);
                return result;
            });
            break;
        default:
            errors.logAndThrowError(new Error('Unknown method name for settings API: ' + apiMethod.name));
        }
        return promise.then(function (result) {
            res.json(result || {});
        }, function (error) {
            res.json(400, {error: error});
        });
    };
};

// Public API
module.exports.posts = posts;
module.exports.users = users;
module.exports.notifications = notifications;
module.exports.settings = settings;
module.exports.themes = themes;
module.exports.requestHandler = requestHandler;
module.exports.cachedSettingsRequestHandler = cachedSettingsRequestHandler;
