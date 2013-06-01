/*globals window, _, $, Backbone */
(function ($) {
    "use strict";

    _.extend(Backbone.View.prototype, {

        // Adds a subview to the current view, which will
        // ensure its removal when this view is removed,
        // or when view.removeSubviews is called
        addSubview: function (view) {
            if (!(view instanceof Backbone.View)) {
                throw new Error("Subview must be a Backbone.View");
            }
            this.subviews = this.subviews || [];
            this.subviews.push(view);
            return view;
        },

        // Removes any subviews associated with this view
        // by `addSubview`, which will in-turn remove any
        // children of those views, and so on.
        removeSubviews: function () {
            var i, l, children = this.subviews;
            if (!children) {
                return this;
            }
            for (i = 0, l = children.length; i < l; i += 1) {
                children[i].remove();
            }
            this.subviews = [];
            return this;
        },

        // Extends the view's remove, by calling `removeSubviews`
        // if any subviews exist.
        remove: function () {
            if (this.subviews) {
                this.removeSubviews();
            }
            return Backbone.View.prototype.remove.apply(this, arguments);
        }

    });

    var Ghost = {
        Layout      : {},
        Views       : {},
        Collections : {},
        Models      : {},

        settings: {
            apiRoot: '/api/v0.1'
        },

        // This is a helper object to denote legacy things in the
        // middle of being transitioned.
        temporary: {},

        currentView: null,
        router: null
    };

    window.Ghost = Ghost;

}());