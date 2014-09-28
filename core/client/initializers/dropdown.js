import BodyEventListener from 'ghost/mixins/body-event-listener';

var DropdownService = Ember.Object.extend(Ember.Evented, BodyEventListener, {
    bodyClick: function (event) {
        /*jshint unused:false */
        this.closeDropdowns();
    },
    closeDropdowns: function () {
        this.trigger('close');
    },
    toggleDropdown: function (dropdownName, dropdownButton) {
        this.trigger('toggle', {target: dropdownName, button: dropdownButton});
    }
});

var dropdownInitializer = {
    name: 'dropdown',

    initialize: function (container, application) {
        application.register('dropdown:service', DropdownService);

        application.inject('component:gh-dropdown', 'dropdown', 'dropdown:service');
        application.inject('component:gh-dropdown-button', 'dropdown', 'dropdown:service');
        application.inject('controller:modals.delete-post', 'dropdown', 'dropdown:service');
        application.inject('controller:modals.transfer-owner', 'dropdown', 'dropdown:service');
        application.inject('route:application', 'dropdown', 'dropdown:service');
    }
};

export default dropdownInitializer;
