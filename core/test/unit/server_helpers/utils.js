// # Helper Test Utils
//
// Contains shared code for intialising tests
//
// @TODO refactor this file out of existence
// I believe if we refactor the handlebars instances and helpers to be more self-contained and modular
// We can likely have init functions which replace the need for this file

// Stuff we are testing
var helpers = require('../../../server/helpers'),
    utils = {};

utils.loadHelpers = function () {
    helpers.loadCoreHelpers();
};

module.exports = utils;
