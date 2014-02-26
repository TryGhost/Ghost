/*global window, document, setTimeout, Ghost, $, _, Backbone, JST, shortcut, NProgress */

(function () {
    "use strict";
    NProgress.configure({ showSpinner: false });

    // Adds in a call to start a loading bar
    // This is sets up a success function which completes the loading bar
    function wrapSync(method, model, options) {
        if (options !== undefined && _.isObject(options)) {
            NProgress.start();

            var self = this,
                oldSuccess = options.success;

            options.success = function () {
                NProgress.done();
                return oldSuccess.apply(self, arguments);
            };
        }

        return Backbone.sync.call(this, method, model, options);
    }

    Ghost.ProgressModel = Backbone.Model.extend({
        sync: wrapSync
    });

    Ghost.ProgressCollection = Backbone.Collection.extend({
        sync: wrapSync
    });
}());