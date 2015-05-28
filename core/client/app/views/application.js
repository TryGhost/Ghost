import Ember from 'ember';
import mobileQuery from 'ghost/utils/mobile';

var ApplicationView = Ember.View.extend({
    classNames: 'gh-app',

    didInsertElement: function () {
        // TODO: BELOW - John wrote this, reimplement in a not-shit way

        // #### Toggle nav between fixed and auto
        $('.gh-autonav-toggle').on('click tap', function () {
            $('.gh-viewport').toggleClass('gh-autonav');
            $('.gh-autonav-toggle i').toggleClass('icon-minimise').toggleClass('icon-maximise');
            $('.gh-nav').removeClass('open');
        });

        // #### Open and close the nav on hover
        $('.gh-nav').mouseenter(function () {
            $('.gh-nav').addClass('open');
        });
        $('.gh-main').mouseenter(function () {
            $('.gh-nav').removeClass('open');
        });
    }
});

export default ApplicationView;
