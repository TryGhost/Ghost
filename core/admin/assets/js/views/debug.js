/*global jQuery, window, document, Ghost, Backbone, $, _, alert */
(function ($, _, Backbone, Ghost) {
    "use strict";

    Ghost.Views.Debug = Ghost.View.extend({
        events: {
            "click .settings-menu a": "handleMenuClick"
        },

        handleMenuClick: function (ev) {
            ev.preventDefault();

            var $target = $(ev.currentTarget);

            // Hide the current content
            this.$(".settings-content").hide();

            // Show the clicked content
            this.$("#debug-" + $target.attr("class")).show();

            return false;
        }
    });

}(jQuery, _, Backbone, window.Ghost));