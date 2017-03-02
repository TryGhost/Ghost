/* eslint-env node */
/* global require, module */
var EmberAddon = require('ember-cli/lib/broccoli/ember-addon');

module.exports = function (defaults) {
    var app = new EmberAddon(defaults, {
        // Add options here
    });

    /*
     This build file specifies the options for the dummy test app of this
     addon, located in `/tests/dummy`
     This build file does *not* influence how the addon or the app using it
     behave. You most likely want to be modifying `./index.js` or app's build file
     */

    return app.toTree();
};
