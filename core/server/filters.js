var when          = require('when'),
    _             = require('lodash'),

    defaults;

when.pipeline = require('when/pipeline');

// ## Default values
/**
 * A hash of default values to use instead of 'magic' numbers/strings.
 * @type {Object}
 */
defaults = {
    filterPriority: 5,
    maxPriority: 9
};

var Filters = function () {
    // Holds the filters
    this.filterCallbacks = [];

    // Holds the filter hooks (that are built in to Ghost Core)
    this.filters = [];
};

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
Filters.prototype.doFilter = function (name, args) {
    var callbacks = this.filterCallbacks[name],
        priorityCallbacks = [];

    // Bug out early if no callbacks by that name
    if (!callbacks) {
        return when.resolve(args);
    }

    // For each priorityLevel
    _.times(defaults.maxPriority + 1, function (priority) {
        // Add a function that runs its priority level callbacks in a pipeline
        priorityCallbacks.push(function (currentArgs) {
            // Bug out if no handlers on this priority
            if (!_.isArray(callbacks[priority])) {
                return when.resolve(currentArgs);
            }

            // Call each handler for this priority level, allowing for promises or values
            return when.pipeline(callbacks[priority], currentArgs);
        });
    });

    return when.pipeline(priorityCallbacks, args);
};

module.exports = new Filters();
module.exports.Filters = Filters;
