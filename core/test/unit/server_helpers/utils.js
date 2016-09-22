// # Helper Test Utils
//
// Contains shared code for intialising tests
//
// @TODO refactor this file out of existence
// I believe if we refactor the handlebars instances and helpers to be more self-contained and modular
// We can likely have init functions which replace the need for this file

var hbs     = require('express-hbs'),

// Stuff we are testing
    helpers = require('../../../server/helpers'),
    utils   = {};

utils.loadHelpers = function () {
    var adminHbs = hbs.create();
    helpers.loadCoreHelpers(adminHbs);
};

module.exports = utils;
