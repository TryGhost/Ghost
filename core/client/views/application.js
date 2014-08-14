var ApplicationView = Ember.View.extend({
    blogRoot: Ember.computed.alias('controller.ghostPaths.blogRoot'),
    
    setupCloseSidebar: function () {
        // #### Navigating within the sidebar closes it.
        $(document).on('click', '.js-close-sidebar', function () {
            $('body').removeClass('off-canvas');
        });
    }.on('didInsertElement'),
    
    actions: {
        toggleSidebar: function () {
            $('body').toggleClass('off-canvas');
        }
    }
});

export default ApplicationView;
