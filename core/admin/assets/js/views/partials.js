/*global window, Ghost, Backbone, $, _ */
(function () {

  Ghost.Views.Nav = Backbone.View.extend({

    events: {
        'click [data-off-canvas]': 'handleClickOff'
    },

    handleClickOff: function (e) {

        if (window.matchMedia('max-width: 650px')) {
            e.preventDefault();
            $('body').toggleClass('off-canvas');
        }

    }

  });

}());