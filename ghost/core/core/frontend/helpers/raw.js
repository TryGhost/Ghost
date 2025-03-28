// # Raw helper
// Usage: `{{{{raw}}}}...{{{{/raw}}}}`
//
// Returns raw contents unprocessed by handlebars.

module.exports = function raw(options) {
    return options.fn(this);
};
