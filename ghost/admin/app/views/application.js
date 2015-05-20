import Ember from 'ember';
import mobileQuery from 'ghost/utils/mobile';

var ApplicationView = Ember.View.extend({
    classNames: 'gh-app',

    didInsertElement: function () {
        // #### Navigating within the sidebar closes it.
        var self = this;

        $('body').on('click tap', '.js-nav-item', function () {
            Ember.run(function () {
                if (mobileQuery.matches) {
                    self.set('controller.showGlobalMobileNav', false);
                }
            });
        });

        // #### Close the nav if mobile and clicking outside of the nav or not the burger toggle
        $('.js-nav-cover').on('click tap', function () {
            Ember.run(function () {
                var isOpen = self.get('controller.showGlobalMobileNav');

                if (isOpen) {
                    self.set('controller.showGlobalMobileNav', false);
                }
            });
        });

        // TODO: ABOVE - All of this can be removed
        // TODO: BELOW - John wrote this, reimplement in a not-shit way

        // #### Toggle nav between fixed and auto
        $('.gh-autonav-toggle').on('click tap', function () {
            $('.gh-viewport').toggleClass('gh-autonav');
            $('.gh-autonav-toggle i').toggleClass('icon-minimise').toggleClass('icon-maximise');
            $('.gh-nav').removeClass('open');
        });

        // #### Open and close the nav on hover
        $('.gh-nav').mouseenter(function() {
            $('.gh-nav').addClass('open');
        });
        $('.gh-main').mouseenter(function() {
            $('.gh-nav').removeClass('open');
        });


        mobileQuery.addListener(this.get('closeGlobalMobileNavOnDesktop'));
    },

    showGlobalMobileNavObserver: function () {
        if (this.get('controller.showGlobalMobileNav')) {
            $('body').addClass('global-nav-expanded');
        } else {
            $('body').removeClass('global-nav-expanded');
        }
    }.observes('controller.showGlobalMobileNav'),

    willDestroyElement: function () {
        mobileQuery.removeListener(this.get('closeGlobalMobileNavOnDesktop'));
        mobileQuery.removeListener(this.get('swapUserMenuDropdownTriangleClasses'));
    },

    toggleSettingsMenuBodyClass: function () {
        $('body').toggleClass('settings-menu-expanded', this.get('controller.showSettingsMenu'));
    }.observes('controller.showSettingsMenu')
});

export default ApplicationView;
