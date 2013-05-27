(function () {
    "use strict";

    var _ = require('underscore'),
        when = require('when'),
        coreFilters;

    coreFilters = function (ghost) {
        var defer = when.defer();

        ghost.registerFilter('ghostNavItems', function (args) {
            var selectedItem;

            // Set the nav items based on the config
            args.navItems = ghost.config().nav;

            // Mark the current selected Item
            selectedItem = _.find(args.navItems, function (item) {
                // TODO: Better selection determination?
                return item.url === args.path;
            });

            if (selectedItem) {
                selectedItem.active = true;
            }

            return args;
        });

        setTimeout(function() {
            defer.resolve();
        }, 30);

        return defer.promise;
    };

    module.exports.loadCoreFilters = coreFilters;

}());