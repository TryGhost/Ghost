var NavigationController = Ember.Controller.extend(Ember.Evented, {

    navigationJSON: Ember.computed('model.navigation', function () {
        var navJSON = JSON.parse(this.get('model.navigation') || {}),
            lastNavItem = navJSON[navJSON.length - 1];
        lastNavItem.last = true; // Set a 'last' property on the last nav item, only used in the template
        return navJSON;
    }),

    actions: {
        addItem: function () {
            // Add a new item
        },

        deleteItem: function () {
            // Delete navItem which should be a function param like: `deleteItem: function(navItem) {`
        },

        save: function () {
            // Save everything
        }
    }
});

export default NavigationController;
