import mobileUtils from 'ghost/utils/mobile-utils';

var SettingsView = Ember.View.extend({
    classNames: ['wrapper'],

    mobileInteractions: function () {
        var responsiveAction = mobileUtils.responsiveAction;

        Ember.run.scheduleOnce('afterRender', this, function () {

            // ### Hide settings page nav items (save, back etc) if the menu is showing
            responsiveAction(event, '(max-width: 650px)', function () {
                if ($('.settings-sidebar[style]').length === 0) {
                    $('.settings-header-inner').css('display', 'none');
                }
            });

            // ### Show settings options page when swiping left on settings menu link
            $('.settings').on('click', '.settings-menu li', function (event) {
                responsiveAction(event, '(max-width: 800px)', function () {
                    $('.settings-sidebar').animate({right: '100%', left: '-110%', 'margin-right': '15px'}, 300);
                    $('.settings-content').animate({right: '0', left: '0', 'margin-left': '0'}, 300);
                    $('.settings-header-inner').css('display', 'block');
                });
            });

            // ### Hide settings options page
            $('.settings').on('click', '.settings-content .button-back', function (event) {
                responsiveAction(event, '(max-width: 800px)', function () {
                    $('.settings-header-inner').css('display', 'none');
                    $('.settings-sidebar').animate({right: '0', left: '0', 'margin-right': '0'}, 300);
                    $('.settings-content').animate({right: '-100%', left: '100%', 'margin-left': '15'}, 300);
                });
            });
        });
    }.on('didInsertElement')
});

export default SettingsView;
