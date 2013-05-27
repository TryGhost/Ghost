/*global window, document, Ghost, Backbone, $, _ */
(function () {

    "use strict",

    Ghost.Router = Backbone.Router.extend({

        routes: {
            'ghost/': 'home',
            'ghost/blog': 'blog',
            'ghost/editor': 'editor',
            'ghost/editor/:id': 'editor',
            'ghost/settings': 'settings',
            'ghost/settings/:segment': 'settings'
        },

        home: function () {
            this.setCurrentPage(new Ghost.Views.Dashboard({el: $("[role='main']")}).render());
        },

        blog: function () {
            // TODO: Grab the collection to pass into the blog view, which
            // will then render the appropriate data as opposed to need to shove it all in the DOM.
            this.setCurrentPage(new Ghost.Views.Blog({el: $("[role='main']")}).render());
        },

        editor: function (id) {
            // TODO: Grab the model for the entry, or create a new one which will
            // be persisted when the save button is clicked.
            this.setCurrentPage(new Ghost.Views.Editor({el: $("[role='main']")}).render());
        },

        settings: function (segment) {
            // TODO: Figure out how the settings will correspond to settings sections, etc.
            this.setCurrentPage(new Ghost.Views.Settings({
                el: $("[role='main']"),
                currentPage: (segment || 'general')
            }).render());
        },

        setCurrentPage: function (view) {

            if (!this.headerView) {
                this.headerView = new Ghost.Views.Nav({el: $("#global-header")});
            }

            if (this.currentView instanceof Backbone.View) {
                this.currentView.remove();
            }

            this.currentView = view;
        }

    });

}());