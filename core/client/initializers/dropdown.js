import DropdownService from 'ghost/utils/dropdown-service';

var dropdownInitializer = {
    name: 'dropdown',

    initialize: function (container, application) {
        application.register('dropdown:service', DropdownService);

        // Inject dropdowns
        application.inject('component:gh-dropdown', 'dropdown', 'dropdown:service');
        application.inject('component:gh-dropdown-button', 'dropdown', 'dropdown:service');
        application.inject('controller:modals.delete-post', 'dropdown', 'dropdown:service');
        application.inject('controller:modals.transfer-owner', 'dropdown', 'dropdown:service');
        application.inject('route:application', 'dropdown', 'dropdown:service');

        // Inject popovers
        application.inject('component:gh-popover', 'dropdown', 'dropdown:service');
        application.inject('component:gh-popover-button', 'dropdown', 'dropdown:service');
        application.inject('route:application', 'dropdown', 'dropdown:service');
    }
};

export default dropdownInitializer;
