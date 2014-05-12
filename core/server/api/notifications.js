var when               = require('when'),
    _                  = require('underscore'),
    // Holds the persistent notifications
    notificationsStore = [],
    notifications;

// ## Notifications
notifications = {

    browse: function browse() {
        return when(notificationsStore);
    },

    // #### Destroy

    // **takes:** an identifier object ({id: id})
    destroy: function destroy(i) {
        notificationsStore = _.reject(notificationsStore, function (element) {
            return element.id === i.id;
        });
        // **returns:** a promise for remaining notifications as a json object
        return when(notificationsStore);
    },

    destroyAll: function destroyAll() {
        notificationsStore = [];
        return when(notificationsStore);
    },

    // #### Add

    // **takes:** a notification object of the form
    // ```
    //  msg = {
    //      type: 'error', // this can be 'error', 'success', 'warn' and 'info'
    //      message: 'This is an error', // A string. Should fit in one line.
    //      status: 'persistent', // or 'passive'
    //      id: 'auniqueid' // A unique ID
    //  };
    // ```
    add: function add(notification) {
        // **returns:** a promise for all notifications as a json object
        return when(notificationsStore.push(notification));
    }
};

module.exports = notifications;