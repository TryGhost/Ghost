/*global window, document, Ghost, Backbone, $, _ */
(function () {

    "use strict";

    var defaultSettings = {
        title: 'My Blog',
        description: ''
    };

    Ghost.Views.Settings = Backbone.View.extend({

        events: {
            'click .js-settings-menu li': 'changePage',
            'click .js-save': 'saveSetting',
            'click .js-add-user': 'addUser'
        },

        initialize: function (options) {
            this.currentPage = options.currentPage;
        },

        // These should be changed into individual views and a structure
        // should be determined for writing these plugins & interacting with the
        // API layer.
        changePage: function (e) {
            if (e) {
                e.preventDefault();
            }
            var newPage = $(e.currentTarget).find('a').attr('href').replace('/ghost/settings/', '');
            if (newPage !== this.currentPage) {
                this.currentPage = newPage;
                this.showPage(newPage);
                Backbone.history.navigate('/ghost/settings/' + newPage);
            }
        },

        showPage: function (page) {
            $('.js-settings-menu li').removeClass('active');
            $('.js-settings-menu li.' + page).addClass('active');
            $('.settings-content').fadeOut().delay(250);
            $('#' + page + '.settings-content').fadeIn();
        },

        saveSetting: function () {
            this.model.save().then(function() {
                console.log(arguments);
            });
        },

        render: function () {
            $('input').iCheck({
                checkboxClass: 'icheckbox_square-grey'
            });
            this.$el.initToggles();
            return this;
        }
    });

}());