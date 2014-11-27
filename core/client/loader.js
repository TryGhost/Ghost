// Loader to create the Ember.js application
/*global require */

if (!window.disableBoot) {
    window.App = require('ghost/app')['default'].create();
}
