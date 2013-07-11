var _ = require('underscore'),
    defaultCoreFilterPriority = 4,
    coreFilters;

coreFilters = function (ghost) {
    ghost.registerFilter('ghostNavItems', defaultCoreFilterPriority, function (args) {
        var selectedItem;

        // we want to clone the config so the config remains unchanged
        // we will need to make this recursive if we start supporting
        // hierarchical menus
        args.navItems = _.map(ghost.config().nav, function (value) {
            return Object.create(value);
        });

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
};

module.exports.loadCoreFilters = coreFilters;