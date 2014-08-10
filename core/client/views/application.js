var ApplicationView = Ember.View.extend({
    setupCloseSidebar: function () {
        // #### Navigating within the sidebar closes it.
        $(document).on('click', '.js-close-sidebar', function () {
            $('body').removeClass('off-canvas');
        });
    }.on('didInsertElement'),
    
    actions: {
        //Sends the user to the front if they're not on mobile,
        //otherwise toggles the sidebar.
        toggleSidebarOrGoHome: function () {
            if (window.matchMedia('(max-width: 650px)').matches) {
                $('body').toggleClass('off-canvas');
            }
            else {
                window.location = this.get('controller.ghostPaths').blogRoot;
            }
        }
    }
});

export default ApplicationView;
