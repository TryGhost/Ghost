// # Ghost Data API
// Provides access to the data model

var Ghost        = require('../ghost'),
    _            = require('underscore'),
    when         = require('when'),
    errors       = require('./errorHandling'),
    permissions  = require('./permissions'),
    canThis      = permissions.canThis,

    ghost        = new Ghost(),
    dataProvider = ghost.dataProvider,
    posts,
    users,
    tags,
    notifications,
    settings,
    themes,
    requestHandler,
    settingsObject,
    settingsCollection,
    settingsFilter,
    filteredUserAttributes = ['password', 'created_by', 'updated_by'];

// ## Posts
posts = {
    // #### Browse

    // **takes:** filter / pagination parameters
    browse: function browse(options) {
        // **returns:** a promise for a page of posts in a json object
        //return dataProvider.Post.findPage(options);
        return dataProvider.Post.findPage(options).then(function (result) {
            var i = 0,
                omitted = result;

            for (i = 0; i < omitted.posts.length; i = i + 1) {
                omitted.posts[i].author = _.omit(omitted.posts[i].author, filteredUserAttributes);
                omitted.posts[i].user = _.omit(omitted.posts[i].user, filteredUserAttributes);
            }
            return omitted;
        });
    },

    // #### Read

    // **takes:** an identifier (id or slug?)
    read: function read(args) {
        // **returns:** a promise for a single post in a json object

        return dataProvider.Post.findOne(args).then(function (result) {
            var omitted;

            if (result) {
                omitted = result.toJSON();
                omitted.author = _.omit(omitted.author, filteredUserAttributes);
                omitted.user = _.omit(omitted.user, filteredUserAttributes);
                return omitted;
            }

            return null;
        });
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
            return when(posts.read({id : args.id})).then(function (result) {
                return dataProvider.Post.destroy(args.id).then(function () {
                    var deletedObj = {};
                    deletedObj.id = result.id;
                    deletedObj.slug = result.slug;
                    return deletedObj;
                });
            });
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

        return dataProvider.User.browse(options).then(function (result) {
            var i = 0,
                omitted = {};

            if (result) {
                omitted = result.toJSON();
            }

            for (i = 0; i < omitted.length; i = i + 1) {
                omitted[i] = _.omit(omitted[i], filteredUserAttributes);
            }

            return omitted;
        });
    },

    // #### Read

    // **takes:** an identifier (id or slug?)
    read: function read(args) {
        // **returns:** a promise for a single user in a json object
        if (args.id === 'me') {
            args = {id: this.user};
        }

        return dataProvider.User.read(args).then(function (result) {
            if (result) {
                var omitted = _.omit(result.toJSON(), filteredUserAttributes);
                return omitted;
            }

            return null;
        });
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
    },

    forgottenPassword: function forgottenPassword(email) {
        return dataProvider.User.forgottenPassword(email);
    }
};

tags = {
    // #### All

    // **takes:** Nothing yet
    all: function browse() {
        // **returns:** a promise for all tags which have previously been used in a json object
        return dataProvider.Tag.findAll();
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
    if (_.isObject(settings)) {
        return _.reduce(settings, function (res, item, key) {
            if (_.isArray(item)) {
                res[key] = item;
            } else {
                res[key] = item.value;
            }
            return res;
        }, {});
    }
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

settingsFilter = function (settings, filter) {
    return _.object(_.filter(_.pairs(settings), function (setting) {
        if (filter) {
            return _.some(filter.split(','), function (f) {
                return setting[1].type === f;
            });
        }
        return true;
    }));
};

settings = {
    // #### Browse

    // **takes:** options object
    browse: function browse(options) {
        // **returns:** a promise for a settings json object
        if (ghost.settings()) {
            return when(ghost.settings()).then(function (settings) {
                return settingsObject(settingsFilter(settings, options.type));
            }, errors.logAndThrowError);
        }
    },

    // #### Read

    // **takes:** either a json object containing a key, or a single key string
    read: function read(options) {
        if (_.isString(options)) {
            options = { key: options };
        }

        if (ghost.settings()) {
            return when(ghost.settings()[options.key]).then(function (setting) {
                if (!setting) {
                    return when.reject("Unable to find setting: " + options.key);
                }
                var res = {};
                res.key = options.key;
                res.value = setting.value;
                return res;
            }, errors.logAndThrowError);
        }
    },

    // #### Edit

     // **takes:** either a json object representing a collection of settings, or a key and value pair
    edit: function edit(key, value) {
        // Check for passing a collection of settings first
        if (_.isObject(key)) {
            //clean data
            var type = key.type;
            delete key.type;
            delete key.availableThemes;

            key = settingsCollection(key);
            return dataProvider.Settings.edit(key).then(function (result) {
                result.models = result;
                return when(ghost.readSettingsResult(result)).then(function (settings) {
                    ghost.updateSettingsCache(settings);
                    return settingsObject(settingsFilter(ghost.settings(), type));
                });
            }, errors.logAndThrowError);
        }
        return dataProvider.Settings.read(key).then(function (setting) {
            if (!setting) {
                return when.reject("Unable to find setting: " + key);
            }
            if (!_.isString(value)) {
                value = JSON.stringify(value);
            }
            setting.set('value', value);
            return dataProvider.Settings.edit(setting).then(function (result) {
                ghost.settings()[_.first(result).attributes.key].value = _.first(result).attributes.value;
                return settingsObject(ghost.settings());
            }, errors.logAndThrowError);
        });
    }
};

// ## Request Handlers

function invalidateCache(req, res, result) {
    var parsedUrl = req._parsedUrl.pathname.replace(/\/$/, '').split('/'),
        method = req.method,
        endpoint = parsedUrl[3],
        id = parsedUrl[4],
        cacheInvalidate;
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        if (endpoint === 'settings' || endpoint === 'users') {
            cacheInvalidate = "/*";
        } else if (endpoint === 'posts') {
            cacheInvalidate = "/, /page/*, /rss/, /rss/*";
            if (id) {
                if (result.toJSON) {
                    cacheInvalidate += ', /' + result.toJSON().slug;
                } else {
                    cacheInvalidate += ', /' + result.slug;
                }
            }
        }
        if (cacheInvalidate) {
            res.set({
                "X-Cache-Invalidate": cacheInvalidate
            });
        }
    }
}

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
            invalidateCache(req, res, result);
            res.json(result || {});
        }, function (error) {
            error = {error: _.isString(error) ? error : (_.isObject(error) ? error.message : 'Unknown API Error')};
            res.json(400, error);
        });
    };
};

// Public API
module.exports.posts = posts;
module.exports.users = users;
module.exports.tags = tags;
module.exports.notifications = notifications;
module.exports.settings = settings;
module.exports.themes = themes;
module.exports.requestHandler = requestHandler;
