// # Ghost Data API
// Provides access to the data model

/**
 * This is intended to replace the old dataProvider files and should access & manipulate the models directly
 */
var Ghost = require('../ghost'),
    _ = require('underscore'),
    when = require('when'),
    errors = require('./errorHandling'),

    ghost = new Ghost(),
    dataProvider = ghost.dataProvider,
    posts,
    users,
    notifications,
    settings,
    requestHandler,
    cachedSettingsRequestHandler,
    settingsObject,
    settingsCollection;

// # Posts
posts = {
    // takes filter / pagination parameters
    // returns a page of posts in a json response
    browse: function browse(options) {
        return dataProvider.Post.findPage(options);
    },
    // takes an identifier (id or slug?)
    // returns a single post in a json response
    read: function read(args) {
        return dataProvider.Post.findOne(args);
    },
    // takes a json object with all the properties which should be updated
    // returns the resulting post in a json response
    edit: function edit(postData) {
        return dataProvider.Post.edit(postData);
    },
    // takes a json object representing a post,
    // returns the resulting post in a json response
    add: function add(postData) {
        return dataProvider.Post.add(postData);
    },
    // takes an identifier (id or slug?)
    // returns a json response with the id of the deleted post
    destroy: function destroy(args) {
        return dataProvider.Post.destroy(args.id);
    }
};

// # Users
users = {
    add: function add(postData) {
        return dataProvider.User.add(postData);
    },
    check: function check(postData) {
        return dataProvider.User.check(postData);
    }
};

// # Notifications

notifications = {
    destroy: function destroy(i) {
        ghost.notifications = _.reject(ghost.notifications, function (element) {
            return element.id === i.id;
        });
        return when(ghost.notifications);
    },
    add: function add(notification) {
        return when(ghost.notifications.push(notification));
    }
};

// # Settings

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
    browse: function browse(options) {
        return dataProvider.Settings.browse(options).then(settingsObject, errors.logAndThrowError);
    },
    read: function read(options) {
        return dataProvider.Settings.read(options.key).then(function (setting) {
            if (!setting) {
                return when.reject("Unable to find setting: " + options.key);
            }

            return _.pick(setting.toJSON(), 'key', 'value');
        }, errors.logAndThrowError);
    },
    edit: function edit(settings) {
        settings = settingsCollection(settings);
        return dataProvider.Settings.edit(settings).then(settingsObject, errors.logAndThrowError);
    }
};

// categories: {};
// post_categories: {};


// requestHandler
// decorator for api functions which are called via an HTTP request
// takes the API method and wraps it so that it gets data from the request and returns a sensible JSON response
requestHandler = function (apiMethod) {
    return function (req, res) {
        var options = _.extend(req.body, req.query, req.params);
        return apiMethod(options).then(function (result) {
            res.json(result || {});
        }, function (error) {
            res.json(400, {error: error});
        });
    };
};

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

module.exports.posts = posts;
module.exports.users = users;
module.exports.notifications = notifications;
module.exports.settings = settings;
module.exports.requestHandler = requestHandler;
module.exports.cachedSettingsRequestHandler = cachedSettingsRequestHandler;
