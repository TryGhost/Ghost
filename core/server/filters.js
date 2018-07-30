
Skip to content

    Pull requests
    Issues
    Marketplace
    Explore

    @freezboltz

1,136
26,351

    5,808

TryGhost/Ghost
Code
Issues 116
Pull requests 20
Projects 0
Wiki
Insights
Ghost/core/server/filters.js
f83cbf6 on Dec 14, 2017
@kirrg001 kirrg001 Moved pipeline/sequence to lib/promise
@hswolff
@halfdan
@ErisDS
@sebgie
@kirrg001
@jdalton
@jaswilli
96 lines (79 sloc) 2.92 KB
// # Filters
// Filters are not yet properly used, this system is intended to allow Apps to extend Ghost in various ways.
var Promise       = require('bluebird'),
    pipeline      = require('./lib/promise/pipeline'),
    _             = require('lodash'),
    defaults;

// ## Default values
/**
 * A hash of default values to use instead of 'magic' numbers/strings.
 * @type {Object}
 */
defaults = {
    filterPriority: 5,
    maxPriority: 9
};

function Filters() {
    // Holds the filters
    this.filterCallbacks = [];

    // Holds the filter hooks (that are built in to Ghost Core)
    this.filters = [];
}

// Register a new filter callback function
Filters.prototype.registerFilter = function (name, priority, fn) {
    // Carry the priority optional parameter to a default of 5
    if (_.isFunction(priority)) {
        fn = priority;
        priority = null;
    }

    // Null priority should be set to default
    if (priority === null) {
        priority = defaults.filterPriority;
    }

    this.filterCallbacks[name] = this.filterCallbacks[name] || {};
    this.filterCallbacks[name][priority] = this.filterCallbacks[name][priority] || [];

    this.filterCallbacks[name][priority].push(fn);
};

// Unregister a filter callback function
Filters.prototype.deregisterFilter = function (name, priority, fn) {
    // Curry the priority optional parameter to a default of 5
    if (_.isFunction(priority)) {
        fn = priority;
        priority = defaults.filterPriority;
    }

    // Check if it even exists
    if (this.filterCallbacks[name] && this.filterCallbacks[name][priority]) {
        // Remove the function from the list of filter funcs
        this.filterCallbacks[name][priority] = _.without(this.filterCallbacks[name][priority], fn);
    }
};

// Execute filter functions in priority order
Filters.prototype.doFilter = function (name, args, context) {
    var callbacks = this.filterCallbacks[name],
        priorityCallbacks = [];

    // Bug out early if no callbacks by that name
    if (!callbacks) {
        return Promise.resolve(args);
    }

    // For each priorityLevel
    _.times(defaults.maxPriority + 1, function (priority) {
        // Add a function that runs its priority level callbacks in a pipeline
        priorityCallbacks.push(function (currentArgs) {
            var callables;

            // Bug out if no handlers on this priority
            if (!_.isArray(callbacks[priority])) {
                return Promise.resolve(currentArgs);
            }

            callables = _.map(callbacks[priority], function (callback) {
                return function (args) {
                    return callback(args, context);
                };
            });
            // Call each handler for this priority level, allowing for promises or values
            return pipeline(callables, currentArgs);
        });
    });

    return pipeline(priorityCallbacks, args);
};

module.exports = new Filters();
module.exports.Filters = Filters;

    © 2018 GitHub, Inc.
    Terms
    Privacy
    Security
    Status
    Help

    Contact GitHub
    API
    Training
    Shop
    Blog
    About

Press h to open a hovercard with more details.
