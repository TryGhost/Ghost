import mobileUtils from 'ghost/utils/mobile-utils';

var SettingsView = Ember.View.extend({
    classNames: ['wrapper'],

    mobileInteractions: function () {
        var responsiveAction = mobileUtils.responsiveAction;

        Ember.run.scheduleOnce('afterRender', this, function () {
            // ### Show settings options page when swiping left on settings menu link
            $('.settings').on('click', '.settings-menu li', function (event) {
                responsiveAction(event, '(max-width: 800px)', function () {
                    $('.settings-sidebar').animate({right: '100%', left: '-102%', 'margin-right': '15px'}, 300);
                    $('.settings-content').animate({right: '0', left: '0', 'margin-left': '0'}, 300);
                    $('.settings-content .button-back, .settings-content .button-save').css('display', 'inline-block');
                });
            });

            // ### Hide settings options page
            $('.settings').on('click', '.settings-content .button-back', function (event) {
                responsiveAction(event, '(max-width: 800px)', function () {
                    $('.settings-sidebar').animate({right: '0', left: '0', 'margin-right': '0'}, 300);
                    $('.settings-content').animate({right: '-100%', left: '100%', 'margin-left': '15'}, 300);
                    $('.settings-content .button-back, .settings-content .button-save').css('display', 'none');
                });
            });
        });
    }.on('didInsertElement')
});

export default SettingsView;
