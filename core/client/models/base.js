/*global window, document, setTimeout, Ghost, $, _, Backbone, JST, shortcut, NProgress */

(function () {
    "use strict";
    NProgress.configure({ showSpinner: false });

    Ghost.ProgressModel = Backbone.Model.extend({

        // Adds in a call to start a loading bar
        // This is sets up a success function which completes the loading bar
        fetch : function (options) {
            options = options || {};

            NProgress.start();

            options.success = function () {
                NProgress.done();
            };

            return Backbone.Model.prototype.fetch.call(this, options);
        }
    });

    Ghost.ProgressCollection = Backbone.Collection.extend({

        // Adds in a call to start a loading bar
        // This is sets up a success function which completes the loading bar
        fetch : function (options) {
            options = options || {};

            NProgress.start();

            options.success = function () {
                NProgress.done();
            };

            return Backbone.Collection.prototype.fetch.call(this, options);
        }
    });
}());