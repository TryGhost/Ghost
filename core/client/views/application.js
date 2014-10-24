import mobileQuery from 'ghost/utils/mobile';
import bind from 'ghost/utils/bind';

var ApplicationView = Ember.View.extend({
    elementId: 'container',

    setupGlobalMobileNav: function () {
        // #### Navigating within the sidebar closes it.
        var self = this;
        $('body').on('click tap', '.js-nav-item', function () {
            if (mobileQuery.matches) {
                self.set('controller.showGlobalMobileNav', false);
            }
        });

        // #### Close the nav if mobile and clicking outside of the nav or not the burger toggle
        $('.js-nav-cover').on('click tap', function () {
            var isOpen = self.get('controller.showGlobalMobileNav');
            if (isOpen) {
                self.set('controller.showGlobalMobileNav', false);
            }
        });

        // #### Listen to the viewport and change user-menu dropdown triangle classes accordingly
        mobileQuery.addListener(this.swapUserMenuDropdownTriangleClasses);
        this.swapUserMenuDropdownTriangleClasses(mobileQuery);
    }.on('didInsertElement'),

    swapUserMenuDropdownTriangleClasses: function (mq) {
        if (mq.matches) {
            $('.js-user-menu-dropdown-menu').removeClass('dropdown-triangle-top-right ').addClass('dropdown-triangle-bottom');
        } else {
            $('.js-user-menu-dropdown-menu').removeClass('dropdown-triangle-bottom').addClass('dropdown-triangle-top-right');
        }
    },

    showGlobalMobileNavObserver: function () {
        if (this.get('controller.showGlobalMobileNav')) {
            $('body').addClass('global-nav-expanded');
        } else {
            $('body').removeClass('global-nav-expanded');
        }
    }.observes('controller.showGlobalMobileNav'),

    setupCloseNavOnDesktop: function () {
        this.set('closeGlobalMobileNavOnDesktop', bind(function closeGlobalMobileNavOnDesktop(mq) {
            if (!mq.matches) {
                // Is desktop sized
                this.set('controller.showGlobalMobileNav', false);
            }
        }, this));

        mobileQuery.addListener(this.closeGlobalMobileNavOnDesktop);
    }.on('didInsertElement'),

    removeCloseNavOnDesktop: function () {
        mobileQuery.removeListener(this.closeGlobalMobileNavOnDesktop);
    }.on('willDestroyElement'),

    toggleSettingsMenuBodyClass: function () {
        $('body').toggleClass('settings-menu-expanded', this.get('controller.showSettingsMenu'));
    }.observes('controller.showSettingsMenu')
});

export default ApplicationView;
