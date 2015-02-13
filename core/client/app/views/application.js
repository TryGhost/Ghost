import mobileQuery from 'ghost/utils/mobile';

var ApplicationView = Ember.View.extend({
    elementId: 'container',

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

        function swapUserMenuDropdownTriangleClasses(mq) {
            if (mq.matches) {
                $('.js-user-menu-dropdown-menu').removeClass('dropdown-triangle-top-right ').addClass('dropdown-triangle-bottom');
            } else {
                $('.js-user-menu-dropdown-menu').removeClass('dropdown-triangle-bottom').addClass('dropdown-triangle-top-right');
            }
        }

        // #### Listen to the viewport and change user-menu dropdown triangle classes accordingly
        this.set('swapUserMenuDropdownTriangleClasses', Ember.run.bind(this, swapUserMenuDropdownTriangleClasses));

        mobileQuery.addListener(this.get('swapUserMenuDropdownTriangleClasses'));
        swapUserMenuDropdownTriangleClasses(mobileQuery);

        this.set('closeGlobalMobileNavOnDesktop', Ember.run.bind(this, function closeGlobalMobileNavOnDesktop(mq) {
            if (!mq.matches) {
                // Is desktop sized
                this.set('controller.showGlobalMobileNav', false);
            }
        }));

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
