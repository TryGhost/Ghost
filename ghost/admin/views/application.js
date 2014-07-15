import {responsiveAction} from 'ghost/utils/mobile';

var ApplicationView = Ember.View.extend({

    mobileInteractions: function () {
        var body = $('body');
        // ### Toggle the mobile sidebar menu
        $('[data-off-canvas]').on('click', function (event) {
            responsiveAction(event, '(max-width: 650px)', function () {
                body.toggleClass('off-canvas');
            });
        });
        // #### Navigating within the sidebar closes it.
        $('.js-close-sidebar').on('click', function () {
            body.removeClass('off-canvas');
        });
    }.on('didInsertElement')
});

export default ApplicationView;
